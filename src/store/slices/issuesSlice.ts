import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { issueApi } from '../../services/api';
import type { Issue } from '../../services/api';

interface IssuesState {
  issues: Issue[];
  currentIssue: Issue | null;
  loading: boolean;
  error: string | null;
}

const initialState: IssuesState = {
  issues: [],
  currentIssue: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchIssues = createAsyncThunk(
  'issues/fetchIssues',
  async (communityId: string) => {
    return await issueApi.fetchIssues(communityId);
  }
);

export const fetchIssue = createAsyncThunk(
  'issues/fetchIssue',
  async (id: string) => {
    return await issueApi.fetchIssue(id);
  }
);

export const createIssue = createAsyncThunk(
  'issues/createIssue',
  async (data: { 
    communityId: string; 
    title: string; 
    description: string; 
    createdBy: string;
  }) => {
    return await issueApi.createIssue(data);
  }
);

export const updateIssue = createAsyncThunk(
  'issues/updateIssue',
  async ({ id, data }: { id: string; data: Partial<Issue> }) => {
    return await issueApi.updateIssue(id, data);
  }
);

export const deleteIssue = createAsyncThunk(
  'issues/deleteIssue',
  async (id: string) => {
    await issueApi.deleteIssue(id);
    return id;
  }
);

const issuesSlice = createSlice({
  name: 'issues',
  initialState,
  reducers: {
    setCurrentIssue: (state, action: PayloadAction<Issue | null>) => {
      state.currentIssue = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch issues
    builder
      .addCase(fetchIssues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssues.fulfilled, (state, action) => {
        state.loading = false;
        state.issues = action.payload;
      })
      .addCase(fetchIssues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch issues';
      });

    // Fetch single issue
    builder
      .addCase(fetchIssue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssue.fulfilled, (state, action) => {
        state.loading = false;
        state.currentIssue = action.payload;
      })
      .addCase(fetchIssue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch issue';
      });

    // Create issue
    builder
      .addCase(createIssue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createIssue.fulfilled, (state, action) => {
        state.loading = false;
        state.issues.push(action.payload);
      })
      .addCase(createIssue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create issue';
      });

    // Update issue
    builder
      .addCase(updateIssue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateIssue.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.issues.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.issues[index] = action.payload;
        }
        if (state.currentIssue?.id === action.payload.id) {
          state.currentIssue = action.payload;
        }
      })
      .addCase(updateIssue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update issue';
      });

    // Delete issue
    builder
      .addCase(deleteIssue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteIssue.fulfilled, (state, action) => {
        state.loading = false;
        state.issues = state.issues.filter(i => i.id !== action.payload);
        if (state.currentIssue?.id === action.payload) {
          state.currentIssue = null;
        }
      })
      .addCase(deleteIssue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete issue';
      });
  },
});

export const { setCurrentIssue, clearError } = issuesSlice.actions;
export default issuesSlice.reducer; 