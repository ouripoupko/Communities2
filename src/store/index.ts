import { configureStore } from '@reduxjs/toolkit';
import communitiesReducer from './slices/communitiesSlice';
import issuesReducer from './slices/issuesSlice';
import userReducer from './slices/userSlice';
import contractsReducer from './slices/contractsSlice';

export const store = configureStore({
  reducer: {
    communities: communitiesReducer,
    issues: issuesReducer,
    user: userReducer,
    contracts: contractsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 