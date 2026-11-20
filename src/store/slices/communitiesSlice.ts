import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  getProperties,
  getMembers,
  getNominations,
  type Nomination,
  getCollaborations,
  type Collaboration,
  type CommunityMember,
  type CommunityProperties,
} from '../../services/contracts/community';
import type { IProfile } from '../../services/interfaces';
import { getPublicProfile } from '../../services/contracts/profile';
import { needsAccess } from '../../services/ibc';
import type { RootState } from '../index';

// Communities state
interface CommunitiesState {
  communityProperties: Record<string, CommunityProperties>;
  accessNeeded: Record<string, boolean>; // contractId -> the app may not read it yet
  communityMembers: Record<string, string[]>; // contractId -> array of member agent ids
  communityTasks: Record<string, Record<string, boolean>>; // contractId -> agentId -> approval status
  communityNominates: Record<string, string[]>; // contractId -> array of candidate public keys
  communityCollaborations: Record<string, Collaboration[]>; // contractId -> collaborations list
  profiles: Record<string, IProfile>; // memberPublicKey -> IProfile (across all communities)
  membersLoading: Record<string, boolean>; // contractId -> loading status for members
  collaborationsLoading: Record<string, boolean>; // contractId -> loading status for collaborations
}

const initialState: CommunitiesState = {
  communityProperties: {},
  accessNeeded: {},
  communityMembers: {},
  communityTasks: {},
  communityNominates: {},
  communityCollaborations: {},
  profiles: {},
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
  async (args: { contractId: string }) => {
    const collaborations = await getCollaborations(args.contractId);
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

/**
 * The user's approvals to give in the web of trust, and whether they gave
 * each: as a nominee, of their vouchers; as a voucher, of their nominees.
 */
function tasksOf(nominations: Nomination[], me: string): Record<string, boolean> {
  const tasks: Record<string, boolean> = {};
  for (const n of nominations) {
    if (n.nominee === me) {
      n.vouchers.forEach((v, i) => { tasks[v] = n.nomineeApproved[i]; });
    } else {
      const i = n.vouchers.indexOf(me);
      if (i >= 0) tasks[n.nominee] = n.vouchedFor[i];
    }
  }
  return tasks;
}

export const fetchCommunityMembers = createAsyncThunk(
  'communities/fetchCommunityMembers',
  async (args: { contractId: string }, { getState, dispatch }) => {
    const [members, nominations] = await Promise.all([getMembers(args.contractId), getNominations(args.contractId)]);

    // The user's own profile is known; the others' (members' and nominees')
    // are read in the background.
    const { user } = getState() as RootState;
    const me = user.publicKey ?? '';
    const newProfiles: Record<string, IProfile> = {};
    if (me && user.profile) newProfiles[me] = user.profile;
    const others = [...members, ...nominations.map((n) => ({ agent: n.nominee, node: n.node, profile: n.profile }))]
      .filter((m) => m.agent !== me);
    void dispatch(fetchMemberProfiles(others));

    return {
      contractId: args.contractId,
      members: members.map((m) => m.agent),
      tasks: tasksOf(nominations, me),
      nominates: nominations.map((n) => n.nominee),
      newProfiles,
    };
  }
);

const communitiesSlice = createSlice({
  name: 'communities',
  initialState,
  reducers: {
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
        }
      });

    // Fetch community members with profiles
    builder
      .addCase(fetchCommunityMembers.pending, (state, action) => {
        // Set loading flag for this specific community
        state.membersLoading[action.meta.arg.contractId] = true;
      })
      .addCase(fetchCommunityMembers.fulfilled, (state, action) => {
        // Clear loading flag for this specific community
        state.membersLoading[action.payload.contractId] = false;
        // Store the array of member agent ids for this community
        state.communityMembers[action.payload.contractId] = action.payload.members;
        // Store the tasks dictionary for this community
        state.communityTasks[action.payload.contractId] = action.payload.tasks;
        // Store the array of candidate public keys for this community
        state.communityNominates[action.payload.contractId] = action.payload.nominates;
        // Merge new profiles into the global profiles dictionary
        Object.assign(state.profiles, action.payload.newProfiles);
      })
      .addCase(fetchCommunityMembers.rejected, (state, action) => {
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

export const { updateMemberProfile } = communitiesSlice.actions;
export default communitiesSlice.reducer; 