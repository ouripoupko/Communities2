import { configureStore } from '@reduxjs/toolkit';
import communitiesReducer from './slices/communitiesSlice';
import userReducer from './slices/userSlice';
import currencyReducer from './slices/currencySlice';

export const store = configureStore({
  reducer: {
    communities: communitiesReducer,
    user: userReducer,
    currency: currencyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 