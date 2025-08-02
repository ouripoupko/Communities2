import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  deployContract,
  contractWrite,
  contractRead,
} from '../../services/api';

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
export const fetchIssueDetails = createAsyncThunk(
  'issues/fetchIssueDetails',
  async (_args: { serverUrl: string; publicKey: string; contractId: string }) => {
    // TODO: Implement fetchIssueDetails API call
    return null;
  }
);

export const updateIssueProperties = createAsyncThunk(
  'issues/updateIssueProperties',
  async (_args: { serverUrl: string; publicKey: string; contractId: string; name: string; text: string }) => {
    // TODO: Implement updateIssueProperties API call
    return null;
  }
);

export const submitVote = createAsyncThunk(
  'issues/submitVote',
  async (_args: { serverUrl: string; publicKey: string; contractId: string; vote: unknown }) => {
    // TODO: Implement submitVote API call
    return null;
  }
);

export const deployIssueContract = createAsyncThunk(
  'issues/deployIssueContract',
  async ({ serverUrl, publicKey }: { serverUrl: string; publicKey: string }) => {
    const contractName = 'unique-gloki-communities-issue-contract';
    const fileName = 'issue_contract.py';
    const code = '';
    // You may want to import the contract code if available
    const response = await deployContract({
      serverUrl,
      publicKey,
      contractName,
      fileName,
      code,
    });
    return response.id || response;
  }
);

export const addIssueToCommunity = createAsyncThunk(
  'issues/addIssueToCommunity',
  async ({ serverUrl, publicKey, contractId, issue }: { serverUrl: string; publicKey: string; contractId: string; issue: { server: string; agent: string; contract: string } }) => {
    // Use contractWrite to call add_issue
    const response = await contractWrite({
      serverUrl,
      publicKey,
      contractId,
      method: 'add_issue',
      args: { issue },
    });
    return response;
  }
);

export const fetchCommunityIssues = createAsyncThunk(
  'issues/fetchCommunityIssues',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    // Use contractRead to call get_issues
    const response = await contractRead({
      serverUrl,
      publicKey,
      contractId,
      method: 'get_issues',
      args: {},
    });
    return response;
  }
);

export const getComments = createAsyncThunk(
  'issues/getComments',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    const response = await contractRead({
      serverUrl,
      publicKey,
      contractId,
      method: 'get_comments',
      args: {},
    });
    return { contractId, comments: response };
  }
);

export const addComment = createAsyncThunk(
  'issues/addComment',
  async ({ serverUrl, publicKey, contractId, comment }: { serverUrl: string; publicKey: string; contractId: string; comment: unknown }) => {
    const response = await contractWrite({
      serverUrl,
      publicKey,
      contractId,
      method: 'add_comment',
      args: { comment },
    });
    return response;
  }
);

export const setIssueDescription = createAsyncThunk(
  'issues/setIssueDescription',
  async ({ serverUrl, publicKey, contractId, text }: { serverUrl: string; publicKey: string; contractId: string; text: string }) => {
    const response = await contractWrite({
      serverUrl,
      publicKey,
      contractId,
      method: 'set_description',
      args: { text },
    });
    return response;
  }
);

// Add getProposals and addProposal thunks for components
export const getProposals = createAsyncThunk(
  'issues/getProposals',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    const response = await contractRead({
      serverUrl,
      publicKey,
      contractId,
      method: 'get_proposals',
      args: {},
    });
    return { contractId, proposals: response };
  }
);

export const addProposal = createAsyncThunk(
  'issues/addProposal',
  async ({ serverUrl, publicKey, contractId, proposal }: { serverUrl: string; publicKey: string; contractId: string; proposal: Proposal }) => {
    const response = await contractWrite({
      serverUrl,
      publicKey,
      contractId,
      method: 'add_proposal',
      args: { proposal },
    });
    return response;
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
        const communityId = action.meta.arg.contractId;
        state.communityIssues[communityId] = action.payload as CommunityIssue[];
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
      .addCase(getProposals.fulfilled, (state, action) => {
        const contractId = action.meta.arg.contractId;
        state.issueProposals[contractId] = action.payload.proposals as Proposal[];
      });
  },
});

export const { setCurrentIssue, clearError } = issuesSlice.actions;
export default issuesSlice.reducer; 