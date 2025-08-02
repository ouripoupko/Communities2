import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Define Community interface
interface Community {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

// Add state for properties and members
interface CommunitiesState {
  communities: Community[];
  currentCommunity: Community | null;
  loading: boolean;
  error: string | null;
  communityProperties: Record<string, any>;
  communityMembers: Record<string, string[]>;
}

const initialState: CommunitiesState = {
  communities: [],
  currentCommunity: null,
  loading: false,
  error: null,
  communityProperties: {},
  communityMembers: {},
};

// Async thunks
export const fetchCommunities = createAsyncThunk(
  'communities/fetchCommunities',
  async () => {
    // TODO: Implement fetchCommunities API call
    return [];
  }
);

export const fetchCommunity = createAsyncThunk(
  'communities/fetchCommunity',
  async (_id: string) => {
    // TODO: Implement fetchCommunity API call
    return null;
  }
);

export const createCommunity = createAsyncThunk(
  'communities/createCommunity',
  async (_data: { name: string; description: string }) => {
    // TODO: Implement createCommunity API call
    return null;
  }
);

export const updateCommunity = createAsyncThunk(
  'communities/updateCommunity',
  async (_args: { id: string; data: Partial<Community> }) => {
    // TODO: Implement updateCommunity API call
    return null;
  }
);

export const deleteCommunity = createAsyncThunk(
  'communities/deleteCommunity',
  async (id: string) => {
    // TODO: Implement deleteCommunity API call
    return id;
  }
);

// Async thunks for community contract data
export const fetchCommunityProperties = createAsyncThunk(
  'communities/fetchCommunityProperties',
  async (_args: { serverUrl: string; publicKey: string; contractId: string }) => {
    // TODO: Implement fetchCommunityProperties API call
    return {};
  }
);

export const updateCommunityProperty = createAsyncThunk(
  'communities/updateCommunityProperty',
  async (_args: { serverUrl: string; publicKey: string; contractId: string; key: string; value: unknown }) => {
    // TODO: Implement updateCommunityProperty API call
    return null;
  }
);

export const fetchCommunityMembers = createAsyncThunk(
  'communities/fetchCommunityMembers',
  async (_args: { serverUrl: string; publicKey: string; contractId: string }) => {
    // TODO: Implement fetchCommunityMembers API call
    return {};
  }
);

export const deployCommunityContract = createAsyncThunk(
  'communities/deployCommunityContract',
  async (_args: { serverUrl: string; publicKey: string }) => {
    // TODO: Implement deployCommunityContract API call
    return null;
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
    // Fetch communities
    builder
      .addCase(fetchCommunities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommunities.fulfilled, (state, action) => {
        state.loading = false;
        state.communities = action.payload;
      })
      .addCase(fetchCommunities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch communities';
      });

    // Fetch single community
    builder
      .addCase(fetchCommunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommunity.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCommunity = action.payload;
      })
      .addCase(fetchCommunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch community';
      });

    // Create community
    builder
      .addCase(createCommunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCommunity.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.communities.unshift(action.payload);
        }
      })
      .addCase(createCommunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create community';
      });

    // Update community
    builder
      .addCase(updateCommunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCommunity.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && typeof action.payload === 'object' && 'id' in action.payload) {
          const payload = action.payload as Community;
          const index = state.communities.findIndex(c => c.id === payload.id);
          if (index !== -1) {
            state.communities[index] = payload;
          }
          if (state.currentCommunity?.id === payload.id) {
            state.currentCommunity = payload;
          }
        }
      })
      .addCase(updateCommunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update community';
      });

    // Delete community
    builder
      .addCase(deleteCommunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCommunity.fulfilled, (state, action) => {
        state.loading = false;
        state.communities = state.communities.filter(c => c.id !== action.payload);
        if (state.currentCommunity?.id === action.payload) {
          state.currentCommunity = null;
        }
      })
      .addCase(deleteCommunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete community';
      });
  },
});

export const { setCurrentCommunity, clearError } = communitiesSlice.actions;
export default communitiesSlice.reducer; 