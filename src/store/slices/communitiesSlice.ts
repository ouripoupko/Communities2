import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { getPartners, getAllPeople, getProperties } from '../../services/contracts/community';
import type { IProfile, IPartner } from '../../services/interfaces';
import { getProfile } from '../../services/contracts/gloki';

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
  communityTasks: Record<string, Record<string, boolean>>; // contractId -> agentId -> approval status
  profiles: Record<string, IProfile>; // memberPublicKey -> IProfile (across all communities)
  loading: boolean;
  membersLoading: Record<string, boolean>; // contractId -> loading status for members
}

const initialState: CommunitiesState = {
  currentCommunity: null,
  error: null,
  communityProperties: {},
  communityMembers: {},
  communityTasks: {},
  profiles: {},
  loading: false,
  membersLoading: {},
};

// Async thunks for community data (will be used in community pages)
export const fetchCommunityProperties = createAsyncThunk(
  'communities/fetchCommunityProperties',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const result = await getProperties(
      args.serverUrl,
      args.publicKey,
      args.contractId,
    );
    return { contractId: args.contractId, properties: result };
  }
);

export const fetchMemberProfile = createAsyncThunk(
  'communities/fetchMemberProfile',
  async (args: { memberServerUrl: string; memberPublicKey: string; memberContractId: string; memberAgent: string }) => {
    const { memberServerUrl, memberPublicKey, memberContractId, memberAgent } = args;
    
    const profile = await getProfile(
      memberServerUrl,
      memberPublicKey,
      memberContractId,
    );
    
    return { memberAgent, profile: profile as IProfile };
  }
);

export const fetchCommunityMembers = createAsyncThunk(
  'communities/fetchCommunityMembers',
  async (args: { serverUrl: string; publicKey: string; contractId: string }, { getState, dispatch }) => {
    const { serverUrl, publicKey, contractId } = args;
    const state = getState() as { communities: CommunitiesState };
    const existingProfiles = state.communities.profiles;
    
    try {
      // Step 1 & 2: Call get_partners and get_all_people in parallel
      const [partnersResult, allPeopleResult] = await Promise.all([
        getPartners(serverUrl, publicKey, contractId ),
        getAllPeople(serverUrl, publicKey, contractId )
      ]);

      const partners = partnersResult as IPartner[];
      const allPeople = allPeopleResult as { tasks: any; members: any; nominates: any };
      const members = Object.keys(allPeople.members) as string[];
      const taskAgents = Object.keys(allPeople.tasks) as string[];
      
      // Step 3: For each member and task agent, fetch their profile in parallel
      // Create a map of agent to partner info for quick lookup
      const partnerMap = new Map<string, IPartner>();
      partners.forEach(partner => {
        partnerMap.set(partner.agent, partner);
      });

      // Combine members and task agents for profile fetching
      const allAgents = [...members, ...taskAgents];

      // Return members data immediately, don't wait for profiles
      const result = { 
        contractId, 
        members: members, // Just the array of member public keys
        tasks: allPeople.tasks, // Tasks dictionary
        newProfiles: {} // No profiles yet, they'll be loaded individually
      };

      // Fetch profiles individually in the background with sequential delays
      const fetchProfilesSequentially = async () => {
        for (const memberAgent of allAgents) {
          // Check 1: if the member already has a profile in the profiles dictionary, no need to call getMemberProfile
          if (existingProfiles[memberAgent]) {
            continue;
          }

          const partner = partnerMap.get(memberAgent);
          if (!partner) {
            console.warn(`No partner found for member ${memberAgent}`);
            continue;
          }

          // Check 2: if any of the fields in the IPartner of this member is missing or undefined or null, don't call getMemberProfile
          if (partner.address && partner.agent && partner.profile) {
            // Dispatch the individual profile fetch thunk
            dispatch(fetchMemberProfile({
              memberServerUrl: partner.address,
              memberPublicKey: partner.agent,
              memberContractId: partner.profile,
              memberAgent: memberAgent,
            }));
          }
        }
      };

      // Start the sequential profile fetching (don't await it)
      fetchProfilesSequentially().catch(error => {
        console.error('Error in sequential profile fetching:', error);
      });

      return result;
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
      delete state.communityTasks[contractId];
      delete state.membersLoading[contractId];
      // Note: We don't delete from profiles as they might be used by other communities
    },
    updateMemberProfile: (state, action: PayloadAction<{ memberAgent: string; profile: IProfile }>) => {
      const { memberAgent, profile } = action.payload;
      state.profiles[memberAgent] = profile;
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
      .addCase(fetchCommunityMembers.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Set loading flag for this specific community
        state.membersLoading[action.meta.arg.contractId] = true;
      })
      .addCase(fetchCommunityMembers.fulfilled, (state, action) => {
        state.loading = false;
        // Clear loading flag for this specific community
        state.membersLoading[action.payload.contractId] = false;
        // Store the array of member public keys for this community
        state.communityMembers[action.payload.contractId] = action.payload.members;
        // Store the tasks dictionary for this community
        state.communityTasks[action.payload.contractId] = action.payload.tasks;
        // Merge new profiles into the global profiles dictionary
        Object.assign(state.profiles, action.payload.newProfiles);
      })
      .addCase(fetchCommunityMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch community members';
        // Clear loading flag for this specific community on error
        if (action.meta.arg) {
          state.membersLoading[action.meta.arg.contractId] = false;
        }
      });

    // Fetch individual member profile
    builder
      .addCase(fetchMemberProfile.fulfilled, (state, action) => {
        const { memberAgent, profile } = action.payload;
        state.profiles[memberAgent] = profile;
      })
      .addCase(fetchMemberProfile.rejected, (_, action) => {
        console.warn(`Failed to fetch profile for member ${action.meta.arg?.memberAgent}:`, action.error);
      });
  },
});

export const { setCurrentCommunity, clearError, clearCommunityData, updateMemberProfile } = communitiesSlice.actions;
export default communitiesSlice.reducer; 