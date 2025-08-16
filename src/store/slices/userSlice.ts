import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { isExistAgent, registerAgent, getContracts, deployContract, contractRead } from '../../services/api';
import type { IContract, IProfile } from '../../services/interfaces';
import type { RootState } from '../index';
import profileContractCode from '../../assets/contracts/gloki_contract.py?raw';

// Interfaces from contractsSlice

// Profile contract unique name
export const PROFILE_CONTRACT_NAME = "unique-gloki-communities-profile-contract";

// Community contract unique name
export const COMMUNITY_CONTRACT_NAME = "unique-gloki-communities-community-contract";

// Complete user state
interface UserState {
  // Authentication
  publicKey: string | null;
  serverUrl: string | null;
  
  // User data
  profile: IProfile | null;
  
  // Contracts
  contracts: IContract[];
  
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
  
  // Contracts
  contracts: [],
  
  // UI state
  loading: false,
  error: null,
};

// Main initialization thunk - handles everything
export const initializeUser = createAsyncThunk(
  'user/initializeUser',
  async (_, { dispatch, getState, rejectWithValue }) => {
    const { publicKey, serverUrl } = (getState() as RootState).user;
    
    if (!publicKey || !serverUrl) {
      return rejectWithValue('Missing publicKey or serverUrl');
    }
    
    try {
      // 1. Check if agent exists
      const agentExists = await isExistAgent({serverUrl, publicKey });
      
      if (!agentExists) {
        // Register agent if it doesn't exist
        await registerAgent({serverUrl, publicKey });
      }
      
      // 2. Get contracts
      dispatch(fetchContracts());
      
      return null;
    } catch (error) {
      return rejectWithValue(String(error));
    }
  }
);

// Fetch contracts (for refreshing)
export const fetchContracts = createAsyncThunk(
  'user/fetchContracts',
  async (_, { dispatch, getState, rejectWithValue }) => {
    const { publicKey, serverUrl } = (getState() as RootState).user;
    
    if (!publicKey || !serverUrl) {
      return rejectWithValue('Missing publicKey or serverUrl');
    }
    
          try {
        const contracts = await getContracts({serverUrl, publicKey });
        
        // Store contracts in Redux state first
        await dispatch(setContracts(contracts || []));
        
        // Then call readProfile which can access contracts from state
        dispatch(readProfile());
        
        return contracts || [];
    } catch (error) {
      return rejectWithValue(String(error));
    }
  }
);

// Fetch contracts (for refreshing)
export const readProfile = createAsyncThunk(
  'user/readProfile',
  async (_, { rejectWithValue, getState }) => {
    const { publicKey, serverUrl, contracts } = (getState() as RootState).user;

    if (!publicKey || !serverUrl) {
      return rejectWithValue('Missing publicKey or serverUrl');
    }
    
    try {
      // 3. Handle profile contract
      const profileContract = contracts?.find((c: IContract) => {
        return c.name === PROFILE_CONTRACT_NAME;
      });
      let profileData = null;
      
      if (profileContract) {
        // Read profile data from existing contract
        const profileResult = await contractRead({
          serverUrl: serverUrl,
          publicKey: publicKey,
          contractId: profileContract.id,
          method: 'get_profile'
        });
        profileData = profileResult;
      } else {
        // Deploy profile contract
        await deployContract({
          serverUrl,
          publicKey,
          name: PROFILE_CONTRACT_NAME,
          contract: 'gloki_contract.py',
          code: profileContractCode
        });
        
        // Set default profile data
        profileData = {
          firstName: '',
          lastName: '',
          userPhoto: '',
          userBio: ''
        };
      }
      
      return { profile: profileData };
    } catch (error) {
      return rejectWithValue(String(error));
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
    clearError: (state) => {
      state.error = null;
    },
    setContracts: (state, action: PayloadAction<IContract[]>) => {
      state.contracts = action.payload;
    },
    clearUser: (state) => {
      state.publicKey = null;
      state.serverUrl = null;
      state.profile = null;
      state.contracts = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Initialize user
    builder
      .addCase(initializeUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeUser.fulfilled, (state) => {
        state.loading = false;
        // initializeUser returns null, so no payload to process
      })
      .addCase(initializeUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
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
      .addCase(readProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(readProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.profile;
      })
      .addCase(readProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
  },
});

export const { setCurrentUser, clearError, setContracts, clearUser } = userSlice.actions;
export default userSlice.reducer; 