import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { getPartners, getMembers, getProperties } from '../../services/contracts/community';
import { getMemberProfile } from '../../services/contracts/gloki';
import type { IProfile, IPartner } from '../../services/interfaces';

// Define Community interface
interface Community {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

// Communities state
interface CommunitiesState {
  currentCommunity: Community | null;
  error: string | null;
  communityProperties: Record<string, any>;
  communityMembers: Record<string, string[]>; // contractId -> array of member public keys
  profiles: Record<string, IProfile>; // memberPublicKey -> IProfile (across all communities)
  loading: boolean;
}

const initialState: CommunitiesState = {
  currentCommunity: null,
  error: null,
  communityProperties: {},
  communityMembers: {},
  profiles: {},
  loading: false,
};

// Async thunks for community data (will be used in community pages)
export const fetchCommunityProperties = createAsyncThunk(
  'communities/fetchCommunityProperties',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const result = await getProperties({
      serverUrl: args.serverUrl,
      publicKey: args.publicKey,
      contractId: args.contractId,
    });
    return { contractId: args.contractId, properties: result };
  }
);

export const fetchCommunityMembers = createAsyncThunk(
  'communities/fetchCommunityMembers',
  async (args: { serverUrl: string; publicKey: string; contractId: string; existingProfiles?: Record<string, IProfile> }) => {
    const { serverUrl, publicKey, contractId, existingProfiles = {} } = args;
    
    try {
      // Step 1 & 2: Call get_partners and get_members in parallel
      const [partnersResult, membersResult] = await Promise.all([
        getPartners({ serverUrl, publicKey, contractId }),
        getMembers({ serverUrl, publicKey, contractId })
      ]);

      console.log('partnersResult', partnersResult);
      console.log('membersResult', membersResult);

      const partners = partnersResult as IPartner[];
      const members = membersResult as string[];

      // Step 3: For each member, fetch their profile in parallel
      // Create a map of agent to partner info for quick lookup
      const partnerMap = new Map<string, IPartner>();
      partners.forEach(partner => {
        partnerMap.set(partner.agent, partner);
      });

      // Fetch all member profiles in parallel
      const newProfiles: Record<string, IProfile> = {};
      const profilePromises = members.map(async (memberAgent) => {
        // Check 1: if the member already has a profile in the profiles dictionary, no need to call getMemberProfile
        if (existingProfiles[memberAgent]) {
          return;
        }

        const partner = partnerMap.get(memberAgent);
        if (!partner) {
          console.warn(`No partner found for member ${memberAgent}`);
          return;
        }

        // Check 2: if any of the fields in the IPartner of this member is missing or undefined or null, don't call getMemberProfile
        if (!partner.address || !partner.agent || !partner.profile) {
          console.warn(`Missing fields in partner data for member ${memberAgent}:`, partner);
          return;
        }

        try {
          const profile = await getMemberProfile({
            memberServerUrl: partner.address,
            memberPublicKey: partner.agent,
            memberContractId: partner.profile,
          });
          newProfiles[memberAgent] = profile as IProfile;
        } catch (error) {
          console.warn(`Failed to fetch profile for member ${memberAgent}:`, error);
          // Don't throw - continue with other members
        }
      });

      // Wait for all profile fetches to complete
      await Promise.all(profilePromises);

      return { 
        contractId, 
        members: members, // Just the array of member public keys
        newProfiles: newProfiles // New profiles fetched
      };
    } catch (error) {
      throw error;
    }
  }
);

const communitiesSlice = createSlice({
  name: 'communities',
  initialState,
  reducers: {
    setCurrentCommunity: (state, action: PayloadAction<Community | null>) => {
      state.currentCommunity = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCommunityData: (state, action: PayloadAction<string>) => {
      const contractId = action.payload;
      delete state.communityProperties[contractId];
      delete state.communityMembers[contractId];
      // Note: We don't delete from profiles as they might be used by other communities
    },
  },
  extraReducers: (builder) => {
    // Fetch community properties
    builder
      .addCase(fetchCommunityProperties.fulfilled, (state, action) => {
        state.communityProperties[action.payload.contractId] = action.payload.properties;
      })
      .addCase(fetchCommunityProperties.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch community properties';
      });

    // Fetch community members with profiles
    builder
      .addCase(fetchCommunityMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommunityMembers.fulfilled, (state, action) => {
        state.loading = false;
        // Store the array of member public keys for this community
        state.communityMembers[action.payload.contractId] = action.payload.members;
        // Merge new profiles into the global profiles dictionary
        Object.assign(state.profiles, action.payload.newProfiles);
      })
      .addCase(fetchCommunityMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch community members';
      });
  },
});

export const { setCurrentCommunity, clearError, clearCommunityData } = communitiesSlice.actions;
export default communitiesSlice.reducer; 