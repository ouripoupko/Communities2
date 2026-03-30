import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getQVConfig,
  getMyQVAllocation,
  getQVResults,
  getQVAllocations,
} from '../../services/contracts/qv';

interface QVState {
  qvConfig: Record<string, Record<string, unknown>>;
  myAllocation: Record<string, Record<string, number>>;
  qvResults: Record<string, Record<string, number>>;
  qvAllocations: Record<string, Record<string, Record<string, number>>>;
  loading: Record<string, boolean>;
  error: string | null;
}

const initialState: QVState = {
  qvConfig: {},
  myAllocation: {},
  qvResults: {},
  qvAllocations: {},
  loading: {},
  error: null,
};

export const fetchQVConfig = createAsyncThunk(
  'qv/fetchConfig',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    const response = await getQVConfig(serverUrl, publicKey, contractId);
    return { contractId, config: response as Record<string, unknown> };
  },
);

export const fetchMyAllocation = createAsyncThunk(
  'qv/fetchMyAllocation',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    const response = await getMyQVAllocation(serverUrl, publicKey, contractId);
    return { contractId, allocation: response as Record<string, number> };
  },
);

export const fetchQVResults = createAsyncThunk(
  'qv/fetchResults',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    const response = await getQVResults(serverUrl, publicKey, contractId);
    return { contractId, results: response as Record<string, number> };
  },
);

export const fetchQVAllocations = createAsyncThunk(
  'qv/fetchAllocations',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    const response = await getQVAllocations(serverUrl, publicKey, contractId);
    return { contractId, allocations: response as Record<string, Record<string, number>> };
  },
);

const qvSlice = createSlice({
  name: 'qv',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchQVConfig.pending, (state, action) => {
        state.loading[action.meta.arg.contractId] = true;
      })
      .addCase(fetchQVConfig.fulfilled, (state, action) => {
        state.qvConfig[action.payload.contractId] = action.payload.config;
        state.loading[action.payload.contractId] = false;
      })
      .addCase(fetchQVConfig.rejected, (state, action) => {
        state.loading[action.meta.arg.contractId] = false;
        state.error = action.error.message || 'Failed to fetch QV config';
      });

    builder
      .addCase(fetchMyAllocation.fulfilled, (state, action) => {
        state.myAllocation[action.payload.contractId] = action.payload.allocation;
      });

    builder
      .addCase(fetchQVResults.fulfilled, (state, action) => {
        state.qvResults[action.payload.contractId] = action.payload.results;
      });

    builder
      .addCase(fetchQVAllocations.fulfilled, (state, action) => {
        state.qvAllocations[action.payload.contractId] = action.payload.allocations;
      });
  },
});

export default qvSlice.reducer;
