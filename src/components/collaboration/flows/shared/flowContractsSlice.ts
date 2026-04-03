import { createSlice, current } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface FlowContractsState {
  /** instanceId -> contractId */
  contracts: Record<string, string>;
  /** instanceId -> true while deploying */
  deploying: Record<string, boolean>;
}

const STORAGE_KEY = 'flowContracts';

function loadFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveToStorage(contracts: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
  } catch {
    // localStorage full or unavailable -- silent fail
  }
}

const initialState: FlowContractsState = {
  contracts: loadFromStorage(),
  deploying: {},
};

const flowContractsSlice = createSlice({
  name: 'flowContracts',
  initialState,
  reducers: {
    setContract(state, action: PayloadAction<{ instanceId: string; contractId: string }>) {
      state.contracts[action.payload.instanceId] = action.payload.contractId;
      state.deploying[action.payload.instanceId] = false;
      saveToStorage(current(state).contracts);
    },
    setDeploying(state, action: PayloadAction<{ instanceId: string }>) {
      state.deploying[action.payload.instanceId] = true;
    },
    clearDeploying(state, action: PayloadAction<{ instanceId: string }>) {
      state.deploying[action.payload.instanceId] = false;
    },
    removeContract(state, action: PayloadAction<{ instanceId: string }>) {
      delete state.contracts[action.payload.instanceId];
      delete state.deploying[action.payload.instanceId];
      saveToStorage(current(state).contracts);
    },
  },
});

export const { setContract, setDeploying, clearDeploying, removeContract } = flowContractsSlice.actions;
export default flowContractsSlice.reducer;
