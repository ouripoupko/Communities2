import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { contractRead } from '../../services/api';

// Define Currency interface
interface Currency {
  id: string;
  name: string;
  symbol: string;
  totalSupply: number;
  circulatingSupply: number;
  decimals: number;
}

// Currency state
interface CurrencyState {
  error: string | null;
  communityCurrencies: Record<string, Currency>;
  currencyBalances: Record<string, Record<string, number>>; // contractId -> publicKey -> balance
}

const initialState: CurrencyState = {
  error: null,
  communityCurrencies: {},
  currencyBalances: {},
};

// Async thunks for currency data
export const fetchCommunityCurrency = createAsyncThunk(
  'currency/fetchCommunityCurrency',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const result = await contractRead({
      serverUrl: args.serverUrl,
      publicKey: args.publicKey,
      contractId: args.contractId,
      method: 'get_currency_info'
    });
    return { contractId: args.contractId, currency: result };
  }
);

export const fetchCurrencyBalances = createAsyncThunk(
  'currency/fetchCurrencyBalances',
  async (args: { serverUrl: string; publicKey: string; contractId: string }) => {
    const result = await contractRead({
      serverUrl: args.serverUrl,
      publicKey: args.publicKey,
      contractId: args.contractId,
      method: 'get_balances'
    });
    return { contractId: args.contractId, balances: result };
  }
);

const currencySlice = createSlice({
  name: 'currency',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch community currency
    builder
      .addCase(fetchCommunityCurrency.fulfilled, (state, action) => {
        state.communityCurrencies[action.payload.contractId] = action.payload.currency;
      })
      .addCase(fetchCommunityCurrency.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch community currency';
      });

    // Fetch currency balances
    builder
      .addCase(fetchCurrencyBalances.fulfilled, (state, action) => {
        state.currencyBalances[action.payload.contractId] = action.payload.balances;
      })
      .addCase(fetchCurrencyBalances.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch currency balances';
      });
  },
});

export const { clearError } = currencySlice.actions;
export default currencySlice.reducer;
