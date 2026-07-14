import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getPolicies, type Policy } from '../../services/contracts/community';

interface PoliciesState {
  communityPolicies: Record<string, Policy[]>; // contractId -> policies list
  policiesLoading: Record<string, boolean>; // contractId -> loading status
  error: string | null;
}

const initialState: PoliciesState = {
  communityPolicies: {},
  policiesLoading: {},
  error: null,
};

export const fetchPolicies = createAsyncThunk(
  'policies/fetchPolicies',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const result = await getPolicies(args.serverUrl, args.publicKey, args.contractId);
    const policies = Array.isArray(result) ? result : [];
    return { contractId: args.contractId, policies };
  },
);

const policiesSlice = createSlice({
  name: 'policies',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPolicies.pending, (state, action) => {
        state.policiesLoading[action.meta.arg.contractId] = true;
      })
      .addCase(fetchPolicies.fulfilled, (state, action) => {
        state.policiesLoading[action.payload.contractId] = false;
        state.communityPolicies[action.payload.contractId] = action.payload.policies;
      })
      .addCase(fetchPolicies.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch policies';
        if (action.meta.arg) {
          state.policiesLoading[action.meta.arg.contractId] = false;
        }
      });
  },
});

export const { clearError } = policiesSlice.actions;
export default policiesSlice.reducer;
