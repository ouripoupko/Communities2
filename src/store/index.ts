import { configureStore } from '@reduxjs/toolkit';
import communitiesReducer from './slices/communitiesSlice';
import userReducer from './slices/userSlice';
import policiesReducer from './slices/policiesSlice';

export const store = configureStore({
  reducer: {
    communities: communitiesReducer,
    user: userReducer,
    policies: policiesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 