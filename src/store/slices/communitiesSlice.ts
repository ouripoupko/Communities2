import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  getProperties,
  getMembers,
  getCollaborations,
  type Collaboration,
  type CommunityMember,
  type CommunityProperties,
} from '../../services/contracts/community';
import type { IProfile } from '../../services/interfaces';
import { getPublicProfile } from '../../services/contracts/profile';
import { needsAccess } from '../../services/ibc';
import type { RootState } from '../index';

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
  communityProperties: Record<string, CommunityProperties>;
  accessNeeded: Record<string, boolean>; // contractId -> the app may not read it yet
  communityMembers: Record<string, string[]>; // contractId -> array of member agent ids
  communityMemberDetails: Record<string, CommunityMember[]>; // contractId -> members with their node and profile
  communityTasks: Record<string, Record<string, boolean>>; // contractId -> agentId -> approval status
  communityNominates: Record<string, string[]>; // contractId -> array of candidate public keys
  communityCollaborations: Record<string, Collaboration[]>; // contractId -> collaborations list
  profiles: Record<string, IProfile>; // memberPublicKey -> IProfile (across all communities)
  loading: boolean;
  membersLoading: Record<string, boolean>; // contractId -> loading status for members
  collaborationsLoading: Record<string, boolean>; // contractId -> loading status for collaborations
}

const initialState: CommunitiesState = {
  currentCommunity: null,
  error: null,
  communityProperties: {},
  accessNeeded: {},
  communityMembers: {},
  communityMemberDetails: {},
  communityTasks: {},
  communityNominates: {},
  communityCollaborations: {},
  profiles: {},
  loading: false,
  membersLoading: {},
  collaborationsLoading: {},
};

// Async thunks for community data (will be used in community pages)
export const fetchCommunityProperties = createAsyncThunk(
  'communities/fetchCommunityProperties',
  async (args: { contractId: string }) => {
    const properties = await getProperties(args.contractId);
    return { contractId: args.contractId, properties };
  }
);

export const fetchCollaborations = createAsyncThunk(
  'communities/fetchCollaborations',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const result = await getCollaborations(
      args.serverUrl,
      args.publicKey,
      args.contractId,
    );
    const collaborations = Array.isArray(result) ? result : [];
    return { contractId: args.contractId, collaborations };
  },
);

// Reads members' profiles on their own nodes, where each member made theirs
// public. A few at a time: nodes limit public reads per client.
export const fetchMemberProfiles = createAsyncThunk(
  'communities/fetchMemberProfiles',
  async (members: CommunityMember[], { dispatch }) => {
    const queue = members.filter((m) => m.node && m.profile);
    const worker = async () => {
      for (let member = queue.shift(); member; member = queue.shift()) {
        try {
          const profile = await getPublicProfile(member.node, member.agent, member.profile);
          dispatch(updateMemberProfile({ memberAgent: member.agent, profile }));
        } catch (error) {
          console.warn(`Failed to read the profile of member ${member.agent}:`, error);
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
  }
);

export const fetchCommunityMembers = createAsyncThunk(
  'communities/fetchCommunityMembers',
  async (args: { contractId: string }, { getState, dispatch }) => {
    const members = await getMembers(args.contractId);

    // The user's own profile is known; the others' are read in the background.
    const { user } = getState() as RootState;
    const newProfiles: Record<string, IProfile> = {};
    if (user.publicKey && user.profile && members.some((m) => m.agent === user.publicKey)) {
      newProfiles[user.publicKey] = user.profile;
    }
    void dispatch(fetchMemberProfiles(members.filter((m) => m.agent !== user.publicKey)));

    return {
      contractId: args.contractId,
      members: members.map((m) => m.agent),
      details: members,
      tasks: {} as Record<string, boolean>,
      nominates: [] as string[],
      newProfiles,
    };
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
      delete state.communityMemberDetails[contractId];
      delete state.communityTasks[contractId];
      delete state.communityNominates[contractId];
      delete state.communityCollaborations[contractId];
      delete state.membersLoading[contractId];
      delete state.collaborationsLoading[contractId];
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
        state.accessNeeded[action.payload.contractId] = false;
      })
      .addCase(fetchCommunityProperties.rejected, (state, action) => {
        if (needsAccess(action.error)) {
          state.accessNeeded[action.meta.arg.contractId] = true;
          return;
        }
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
        // Store the array of member agent ids for this community, and the members' details
        state.communityMembers[action.payload.contractId] = action.payload.members;
        state.communityMemberDetails[action.payload.contractId] = action.payload.details;
        // Store the tasks dictionary for this community
        state.communityTasks[action.payload.contractId] = action.payload.tasks;
        // Store the array of candidate public keys for this community
        state.communityNominates[action.payload.contractId] = action.payload.nominates;
        // Merge new profiles into the global profiles dictionary
        Object.assign(state.profiles, action.payload.newProfiles);
      })
      .addCase(fetchCommunityMembers.rejected, (state, action) => {
        state.loading = false;
        if (!needsAccess(action.error)) {
          state.error = action.error.message || 'Failed to fetch community members';
        }
        // Clear loading flag for this specific community on error
        if (action.meta.arg) {
          state.membersLoading[action.meta.arg.contractId] = false;
        }
      });

    // Fetch collaborations
    builder
      .addCase(fetchCollaborations.pending, (state, action) => {
        state.collaborationsLoading[action.meta.arg.contractId] = true;
      })
      .addCase(fetchCollaborations.fulfilled, (state, action) => {
        state.collaborationsLoading[action.payload.contractId] = false;
        state.communityCollaborations[action.payload.contractId] =
          action.payload.collaborations;
      })
      .addCase(fetchCollaborations.rejected, (state, action) => {
        if (action.meta.arg) {
          state.collaborationsLoading[action.meta.arg.contractId] = false;
        }
      });
  },
});

export const { setCurrentCommunity, clearError, clearCommunityData, updateMemberProfile } = communitiesSlice.actions;
export default communitiesSlice.reducer; 