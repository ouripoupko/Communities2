import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { IProfile } from '../../services/interfaces';
import type { RootState } from '../index';
import { getApp } from '../../services/ibc';
import type { ContractSummary } from '../../services/ibc';
import { PROFILE_CONTRACT_NAME, deployProfile, getProfile } from '../../services/contracts/profile';

// Complete user state
interface UserState {
  // Authentication: the user's agent id (an address) and their node's URL
  publicKey: string | null;
  serverUrl: string | null;

  // User data
  profile: IProfile | null;
  profileContractId: string | null;
  profilePublic: boolean; // whether anyone may read the profile (others read it so)

  // Contracts
  contracts: ContractSummary[];

  // UI state
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  // Authentication
  publicKey: null,
  serverUrl: null,

  // User data
  profile: null,
  profileContractId: null,
  profilePublic: false,

  // Contracts
  contracts: [],

  // UI state
  loading: false,
  error: null,
};

// Fetch the contracts this app may see (for refreshing), then the profile
export const fetchContracts = createAsyncThunk(
  'user/fetchContracts',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const contracts = (await getApp().ibc?.contracts()) ?? [];

      // Store contracts in Redux state first
      dispatch(setContracts(contracts));

      // Then call readProfile which can access contracts from state
      await dispatch(readProfile());

      return contracts;
    } catch (error) {
      return rejectWithValue(String(error));
    }
  }
);

// Read the profile from the user's profile contract, if they have one yet
export const readProfile = createAsyncThunk(
  'user/readProfile',
  async (_, { rejectWithValue, getState }) => {
    const { contracts } = (getState() as RootState).user;

    try {
      const profileContract = contracts.find(
        (c) => c.name === PROFILE_CONTRACT_NAME && !c.deploy_error,
      );
      if (!profileContract) {
        return { profile: null, profileContractId: null, profilePublic: false };
      }
      const profile = await getProfile(profileContract.id);
      return { profile, profileContractId: profileContract.id, profilePublic: profileContract.public === true };
    } catch (error) {
      return rejectWithValue(String(error));
    }
  }
);

// Deploy the user's profile contract. Opens the node's approval page, so
// call it from a click.
export const createProfile = createAsyncThunk(
  'user/createProfile',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await deployProfile();
      await dispatch(fetchContracts());
      return null;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : String(error));
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<{ publicKey: string; serverUrl: string } | null>) => {
      if (action.payload) {
        state.publicKey = action.payload.publicKey;
        state.serverUrl = action.payload.serverUrl;
      } else {
        state.publicKey = null;
        state.serverUrl = null;
      }
    },
    setContracts: (state, action: PayloadAction<ContractSummary[]>) => {
      state.contracts = action.payload;
    },
    clearUser: (state) => {
      state.publicKey = null;
      state.serverUrl = null;
      state.profile = null;
      state.profileContractId = null;
      state.profilePublic = false;
      state.contracts = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch contracts
      .addCase(fetchContracts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContracts.fulfilled, (state, action) => {
        state.loading = false;
        state.contracts = action.payload;
      })
      .addCase(fetchContracts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Read profile
      .addCase(readProfile.fulfilled, (state, action) => {
        state.profile = action.payload.profile;
        state.profileContractId = action.payload.profileContractId;
        state.profilePublic = action.payload.profilePublic;
      })
      .addCase(readProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentUser, setContracts, clearUser } = userSlice.actions;
export default userSlice.reducer;
