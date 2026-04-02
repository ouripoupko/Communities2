import { configureStore } from '@reduxjs/toolkit';
import communitiesReducer from './slices/communitiesSlice';
import issuesReducer from './slices/issuesSlice';
import userReducer from './slices/userSlice';
import currencyReducer from './slices/currencySlice';
import initiativeReducer from './slices/initiativeSlice';
import wishReducer from './slices/wishSlice';
import agreementReducer from './slices/agreementSlice';
import flowContractsReducer from '../components/collaboration/flows/shared/flowContractsSlice';

export const store = configureStore({
  reducer: {
    communities: communitiesReducer,
    issues: issuesReducer,
    user: userReducer,
    currency: currencyReducer,
    initiative: initiativeReducer,
    wish: wishReducer,
    agreement: agreementReducer,
    flowContracts: flowContractsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 