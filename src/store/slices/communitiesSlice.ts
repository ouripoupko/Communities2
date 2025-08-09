import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { contractRead } from '../../services/api';

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
  communityMembers: Record<string, string[]>;
}

const initialState: CommunitiesState = {
  currentCommunity: null,
  error: null,
  communityProperties: {},
  communityMembers: {},
};

// Async thunks for community data (will be used in community pages)
export const fetchCommunityProperties = createAsyncThunk(
  'communities/fetchCommunityProperties',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const result = await contractRead({
      serverUrl: args.serverUrl,
      publicKey: args.publicKey,
      contractId: args.contractId,
      method: 'get_properties'
    });
    return { contractId: args.contractId, properties: result };
  }
);

export const fetchCommunityMembers = createAsyncThunk(
  'communities/fetchCommunityMembers',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const result = await contractRead({
      serverUrl: args.serverUrl,
      publicKey: args.publicKey,
      contractId: args.contractId,
      method: 'get_members'
    });
    return { contractId: args.contractId, members: result };
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

    // Fetch community members
    builder
      .addCase(fetchCommunityMembers.fulfilled, (state, action) => {
        state.communityMembers[action.payload.contractId] = action.payload.members;
      })
      .addCase(fetchCommunityMembers.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch community members';
      });
  },
});

export const { setCurrentCommunity, clearError } = communitiesSlice.actions;
export default communitiesSlice.reducer; 