import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { communityApi } from '../../services/api';
import type { Community } from '../../services/api';

interface CommunitiesState {
  communities: Community[];
  currentCommunity: Community | null;
  loading: boolean;
  error: string | null;
}

const initialState: CommunitiesState = {
  communities: [],
  currentCommunity: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchCommunities = createAsyncThunk(
  'communities/fetchCommunities',
  async () => {
    return await communityApi.fetchCommunities();
  }
);

export const fetchCommunity = createAsyncThunk(
  'communities/fetchCommunity',
  async (id: string) => {
    return await communityApi.fetchCommunity(id);
  }
);

export const createCommunity = createAsyncThunk(
  'communities/createCommunity',
  async (data: { name: string; description: string }) => {
    return await communityApi.createCommunity(data);
  }
);

export const updateCommunity = createAsyncThunk(
  'communities/updateCommunity',
  async ({ id, data }: { id: string; data: Partial<Community> }) => {
    return await communityApi.updateCommunity(id, data);
  }
);

export const deleteCommunity = createAsyncThunk(
  'communities/deleteCommunity',
  async (id: string) => {
    await communityApi.deleteCommunity(id);
    return id;
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
        state.communities.unshift(action.payload);
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
        const index = state.communities.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.communities[index] = action.payload;
        }
        if (state.currentCommunity?.id === action.payload.id) {
          state.currentCommunity = action.payload;
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