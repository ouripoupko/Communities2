import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { getAgreement } from '../../services/contracts/agreement';

export interface AgreementDetails {
  rule?: string;
  protection?: string;
  consensusStatus?: string;
  createdAt?: number;
  votes?: Record<string, unknown>;
}

interface AgreementState {
  agreementDetails: Record<string, AgreementDetails>;
  loading: Record<string, boolean>;
  error: string | null;
}

const initialState: AgreementState = {
  agreementDetails: {},
  loading: {},
  error: null,
};

export const fetchAgreement = createAsyncThunk(
  'agreement/fetchAgreement',
  async (args: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
  }) => {
    const result = await getAgreement(
      args.serverUrl,
      args.publicKey,
      args.contractId,
    );
    return { contractId: args.contractId, agreement: result };
  },
);

const agreementSlice = createSlice({
  name: 'agreement',
  initialState,
  reducers: {
    clearAgreement: (state, action: PayloadAction<string>) => {
      delete state.agreementDetails[action.payload];
      delete state.loading[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgreement.pending, (state, action) => {
        state.loading[action.meta.arg.contractId] = true;
        state.error = null;
      })
      .addCase(fetchAgreement.fulfilled, (state, action) => {
        state.loading[action.payload.contractId] = false;
        state.agreementDetails[action.payload.contractId] =
          action.payload.agreement as AgreementDetails;
      })
      .addCase(fetchAgreement.rejected, (state, action) => {
        if (action.meta.arg) {
          state.loading[action.meta.arg.contractId] = false;
        }
        state.error = action.error.message || 'Failed to fetch agreement';
      });
  },
});

export const { clearAgreement } = agreementSlice.actions;
export default agreementSlice.reducer;
