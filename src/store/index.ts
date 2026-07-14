import { configureStore } from '@reduxjs/toolkit';
import communitiesReducer from './slices/communitiesSlice';
import issuesReducer from './slices/issuesSlice';
import userReducer from './slices/userSlice';
import policiesReducer from './slices/policiesSlice';
import initiativeReducer from './slices/initiativeSlice';
import wishReducer from './slices/wishSlice';
import agreementReducer from './slices/agreementSlice';

export const store = configureStore({
  reducer: {
    communities: communitiesReducer,
    issues: issuesReducer,
    user: userReducer,
    policies: policiesReducer,
    initiative: initiativeReducer,
    wish: wishReducer,
    agreement: agreementReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 