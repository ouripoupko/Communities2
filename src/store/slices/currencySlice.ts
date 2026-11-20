import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAccounts,
  getCurrency,
  getPolicies,
  type Account,
  type CurrencyState,
  type Policy,
} from '../../services/contracts/community';

// A community's currency: its accounts, its policies, and where the balances
// stand (calculated up to which day).
interface CurrencySliceState {
  communityAccounts: Record<string, Account[]>; // contractId -> accounts
  communityPolicies: Record<string, Policy[]>; // contractId -> policies
  communityCurrency: Record<string, CurrencyState>; // contractId -> balances' state
  currencyLoading: Record<string, boolean>; // contractId -> loading status
}

const initialState: CurrencySliceState = {
  communityAccounts: {},
  communityPolicies: {},
  communityCurrency: {},
  currencyLoading: {},
};

export const fetchCurrency = createAsyncThunk(
  'currency/fetchCurrency',
  async (args: { contractId: string }) => {
    const [accounts, policies, currency] = await Promise.all([
      getAccounts(args.contractId),
      getPolicies(args.contractId),
      getCurrency(args.contractId),
    ]);
    return { contractId: args.contractId, accounts, policies, currency };
  },
);

const currencySlice = createSlice({
  name: 'currency',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrency.pending, (state, action) => {
        state.currencyLoading[action.meta.arg.contractId] = true;
      })
      .addCase(fetchCurrency.fulfilled, (state, action) => {
        const { contractId, accounts, policies, currency } = action.payload;
        state.currencyLoading[contractId] = false;
        state.communityAccounts[contractId] = accounts;
        state.communityPolicies[contractId] = policies;
        state.communityCurrency[contractId] = currency;
      })
      .addCase(fetchCurrency.rejected, (state, action) => {
        if (action.meta.arg) {
          state.currencyLoading[action.meta.arg.contractId] = false;
        }
      });
  },
});

export default currencySlice.reducer;
