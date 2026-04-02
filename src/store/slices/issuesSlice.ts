import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { getIssues } from '../../services/contracts/community';
import { getAiFeedback, getCommentsFromServer, getIssue, getProposalsFromServer } from '../../services/contracts/issue';

// Define Proposal and CommunityIssue interfaces
interface Proposal {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  voteCount: number;
}
interface CommunityIssue {
  id?: string;
  title?: string;
  description?: string;
  server: string;
  agent: string;
  contract: string;
}

// Add state for proposals, votes, and issue details
interface IssuesState {
  issues: CommunityIssue[];
  currentIssue: CommunityIssue | null;
  loading: boolean;
  error: string | null;
  issueDetails: Record<string, any>;
  issueProposals: Record<string, Proposal[]>;
  proposalsLoading: Record<string, boolean>;
  communityIssues: Record<string, CommunityIssue[]>;
  issueComments: Record<string, any[]>;
}

const initialState: IssuesState = {
  issues: [],
  currentIssue: null,
  loading: false,
  error: null,
  issueDetails: {},
  issueProposals: {},
  proposalsLoading: {},
  communityIssues: {},
  issueComments: {},
};

// Async thunks
export const fetchIssues = createAsyncThunk(
  'issues/fetchIssues',
  async (_communityId: string) => {
    // TODO: Implement fetchIssues API call
    return [];
  }
);

export const fetchIssue = createAsyncThunk(
  'issues/fetchIssue',
  async (_id: string) => {
    // TODO: Implement fetchIssue API call
    return null;
  }
);

export const createIssue = createAsyncThunk(
  'issues/createIssue',
  async (_data: {
    communityId: string;
    title: string;
    description: string;
    createdBy: string;
  }) => {
    // TODO: Implement createIssue API call
    return null;
  }
);

export const updateIssue = createAsyncThunk(
  'issues/updateIssue',
  async (_args: { id: string; data: Partial<CommunityIssue> }) => {
    // TODO: Implement updateIssue API call
    return null;
  }
);

export const deleteIssue = createAsyncThunk(
  'issues/deleteIssue',
  async (id: string) => {
    // TODO: Implement deleteIssue API call
    return id;
  }
);

// Async thunks for issue contract data
export const fetchCommunityIssues = createAsyncThunk(
  'issues/fetchCommunityIssues',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const result = await getIssues(
      args.serverUrl,
      args.publicKey,
      args.contractId,
    );
    return { contractId: args.contractId, issues: result };
  }
);

export const fetchIssueDetails = createAsyncThunk(
  'issues/fetchIssueDetails',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const [issueResult, aiFeedbackRaw] = await Promise.all([
      getIssue(args.serverUrl, args.publicKey, args.contractId),
      getAiFeedback(args.serverUrl, args.publicKey, args.contractId).catch(
        () => null,
      ),
    ]);
    const aiFeedback =
      typeof aiFeedbackRaw === 'string'
        ? aiFeedbackRaw
        : aiFeedbackRaw != null &&
            typeof (aiFeedbackRaw as { value?: string }).value === 'string'
          ? (aiFeedbackRaw as { value: string }).value
          : '';
    const issueDetails =
      typeof issueResult === 'object' && issueResult !== null
        ? { ...issueResult, ai_feedback: aiFeedback }
        : { ...issueResult, ai_feedback: aiFeedback };
    return { contractId: args.contractId, issueDetails };
  }
);

export const getComments = createAsyncThunk(
  'issues/getComments',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    const response = await getCommentsFromServer(
      serverUrl,
      publicKey,
      contractId,
    );
    return { contractId, comments: response };
  }
);

// Add getProposals thunk for components
export const getProposals = createAsyncThunk(
  'issues/getProposals',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    const response = await getProposalsFromServer(
      serverUrl,
      publicKey,
      contractId,
    );
    return { contractId, proposals: response };
  }
);

const issuesSlice = createSlice({
  name: 'issues',
  initialState,
  reducers: {
    setCurrentIssue: (state, action: PayloadAction<CommunityIssue | null>) => {
      state.currentIssue = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    /** Update only ai_feedback for an issue (avoids full refetch and UI flicker) */
    setIssueAiFeedback: (
      state,
      action: PayloadAction<{ contractId: string; aiFeedback: string }>,
    ) => {
      const { contractId, aiFeedback } = action.payload;
      if (state.issueDetails[contractId]) {
        state.issueDetails[contractId].ai_feedback = aiFeedback;
      }
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
        state.issues = action.payload as CommunityIssue[];
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
        if (action.payload) {
          state.issues.push(action.payload);
        }
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
        if (action.payload && typeof action.payload === 'object' && 'id' in action.payload) {
          const payload = action.payload as CommunityIssue;
          const index = state.issues.findIndex((i: CommunityIssue) => i.id === payload.id);
          if (index !== -1) {
            state.issues[index] = payload;
          }
          if (state.currentIssue?.id === payload.id) {
            state.currentIssue = payload;
          }
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
        state.issues = state.issues.filter((i: CommunityIssue) => i.id !== action.payload);
        if (state.currentIssue?.id === action.payload) {
          state.currentIssue = null;
        }
      })
      .addCase(deleteIssue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete issue';
      });

    // Fetch community issues
    builder
      .addCase(fetchCommunityIssues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommunityIssues.fulfilled, (state, action) => {
        state.loading = false;
        state.communityIssues[action.payload.contractId] = action.payload.issues;
      })
      .addCase(fetchCommunityIssues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch community issues';
      });

    builder
      .addCase(getComments.fulfilled, (state, action) => {
        const contractId = action.payload.contractId;
        state.issueComments[contractId] = action.payload.comments;
      });

    builder
      .addCase(getProposals.pending, (state, action) => {
        state.proposalsLoading[action.meta.arg.contractId] = true;
      })
      .addCase(getProposals.fulfilled, (state, action) => {
        const contractId = action.payload.contractId;
        state.issueProposals[contractId] = action.payload.proposals as Proposal[];
        state.proposalsLoading[contractId] = false;
      })
      .addCase(getProposals.rejected, (state, action) => {
        state.proposalsLoading[action.meta.arg.contractId] = false;
        state.error = action.error.message || 'Failed to fetch proposals';
      });

    // Fetch issue details
    builder
      .addCase(fetchIssueDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssueDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.issueDetails[action.payload.contractId] = action.payload.issueDetails;
      })
      .addCase(fetchIssueDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch issue details';
      });
  },
});

export const { setCurrentIssue, clearError, setIssueAiFeedback } = issuesSlice.actions;
export default issuesSlice.reducer; 