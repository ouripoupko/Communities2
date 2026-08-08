import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initializeUser, setCurrentUser, clearUser, fetchContracts } from '../store/slices/userSlice';
import type { AppDispatch, RootState } from '../store';
import { eventStreamService } from '../services/eventStream';
import { isExistAgent } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  bootError: string | null;
  login: (publicKey: string, serverUrl: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const initializationRef = useRef(false);
  
  // Get user data from Redux
  const user = useSelector((state: RootState) => state.user);
  const isAuthenticated = !!(user.publicKey && user.serverUrl);

  // Stable reference so add/removeEventListener target the same closure
  // across logins/logout instead of accumulating duplicates.
  const handleContractDeploy = useCallback(() => {
    dispatch(fetchContracts());
  }, [dispatch]);

  useEffect(() => {
    // StrictMode runs effects twice in dev - bail out of the repeat run
    // entirely (including the "nothing to do" case below) so it can't
    // touch isLoading while the first run's validateStoredCredentials is
    // still in flight. Without this, the second run would flip isLoading
    // to false early and flash the login page before the real check
    // resolves and marks the session authenticated.
    if (initializationRef.current) return;
    initializationRef.current = true;

    // Check for stored user data on app load
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setIsLoading(false);
      return;
    }
    try {
      const userData = JSON.parse(storedUser);
      // Validate stored credentials and load contracts. Deliberately not
      // dispatching setCurrentUser here — that only happens once the
      // agent is confirmed to still exist on the server, so a stale
      // local session can't flash the authenticated app before we know.
      void validateStoredCredentials(userData.publicKey, userData.serverUrl);
    } catch (error) {
      localStorage.removeItem('user');
      setIsLoading(false);
    }
  }, [dispatch]);

  const validateStoredCredentials = async (publicKey: string, serverUrl: string) => {
    try {
      // The server's DB may have been reset since these credentials were
      // stored (e.g. during development) — if the agent no longer exists,
      // don't silently recreate a blank one and drop the user straight
      // into the app. Leave the stale credentials in localStorage (the
      // login page will read and prefill them) and fall through to login.
      const exists = await isExistAgent({ serverUrl, publicKey });
      if (!exists) {
        setIsLoading(false);
        return;
      }

      dispatch(setCurrentUser({ publicKey, serverUrl }));

      // Connect to the SSE stream BEFORE initialization so we can catch deploy_contract events
      eventStreamService.connect(serverUrl, publicKey);

      // Set up listener for contract deployment events to refresh contracts list
      eventStreamService.addEventListener('deploy_contract', handleContractDeploy);

      // Use the new initializeUser thunk which handles everything
      await dispatch(initializeUser()).unwrap();

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to restore session:', err);
      setBootError("We couldn't connect to the server to check your account. Please check your internet connection, then reload the page to try again.");
      setIsLoading(false);
    }
  };

  const login = async (publicKey: string, serverUrl: string) => {
    try {
      setIsLoading(true);
      
      // Set the current user in Redux state first
      dispatch(setCurrentUser({ publicKey, serverUrl }));
      
      // Connect to the SSE stream BEFORE initialization so we can catch deploy_contract events
      eventStreamService.connect(serverUrl, publicKey);

      // Set up listener for contract deployment events to refresh contracts list
      eventStreamService.addEventListener('deploy_contract', handleContractDeploy);

      // Use the new initializeUser thunk which handles everything
      await dispatch(initializeUser()).unwrap();

      // Store in localStorage
      localStorage.setItem('user', JSON.stringify({ publicKey, serverUrl }));
    } catch (err) {
      // Error handling: just throw error for now
      throw new Error(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    
    // Clear user data from Redux
    dispatch(clearUser());

    // Remove the deploy_contract listener and disconnect from the SSE stream
    eventStreamService.removeEventListener('deploy_contract', handleContractDeploy);
    eventStreamService.disconnect();
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    bootError,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 