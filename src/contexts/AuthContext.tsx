import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentUser, clearUser, fetchContracts } from '../store/slices/userSlice';
import type { AppDispatch, RootState } from '../store';
import { eventStreamService } from '../services/eventStream';
import { openApp, forgetApp, isSessionGone } from '../services/ibc';
import type { IbcApp } from '../services/ibc';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  bootError: string | null;
  login: (serverUrl: string) => Promise<void>;
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

  // Events sent while the stream was down are lost, so read again when it
  // reopens (not when it first opens: the session reads right after).
  const streamWasOpen = useRef(false);
  const handleConnectionChange = useCallback((isConnected: boolean) => {
    if (isConnected && streamWasOpen.current) dispatch(fetchContracts());
    if (isConnected) streamWasOpen.current = true;
  }, [dispatch]);

  // Starts the session for an app the user has connected.
  const startSession = useCallback(async (app: IbcApp, agent: string, serverUrl: string) => {
    dispatch(setCurrentUser({ publicKey: agent, serverUrl }));

    // Connect to the event stream BEFORE loading contracts so we can catch deploy_contract events
    streamWasOpen.current = false;
    eventStreamService.addConnectionListener(handleConnectionChange);
    eventStreamService.connect(app);
    eventStreamService.addEventListener('deploy_contract', handleContractDeploy);

    await dispatch(fetchContracts()).unwrap();
  }, [dispatch, handleContractDeploy, handleConnectionChange]);

  // Ends the session in this app and this browser: clears the user's data,
  // stops the event stream, and forgets the app's key, so the next login
  // asks the user again.
  const endSession = useCallback(() => {
    dispatch(clearUser());
    eventStreamService.removeEventListener('deploy_contract', handleContractDeploy);
    eventStreamService.removeConnectionListener(handleConnectionChange);
    eventStreamService.disconnect();
    void forgetApp();
  }, [dispatch, handleContractDeploy, handleConnectionChange]);

  // The app remembers, in this browser, the agent the user connected it to.
  // If it has none, or the node no longer knows the app (the user
  // disconnected it, or the node lost its data), fall through to the login
  // page, which keeps the stored node URL.
  const restoreSession = async (serverUrl: string) => {
    try {
      const app = await openApp(serverUrl);
      if (app.agent) {
        await startSession(app, app.agent, serverUrl);
      }
    } catch (err) {
      if (isSessionGone(err)) {
        console.warn('The node no longer knows this session; logging in again:', err);
        endSession();
        return;
      }
      console.error('Failed to restore session:', err);
      setBootError("We couldn't connect to your node. Please check that it is running and reachable, then reload the page to try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // StrictMode runs effects twice in dev - bail out of the repeat run
    // entirely (including the "nothing to do" case below) so it can't
    // touch isLoading while the first run's restore is still in flight.
    if (initializationRef.current) return;
    initializationRef.current = true;

    // Check for a stored session on app load
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setIsLoading(false);
      return;
    }
    try {
      const { serverUrl } = JSON.parse(storedUser);
      void restoreSession(serverUrl);
    } catch {
      localStorage.removeItem('user');
      setIsLoading(false);
    }
  }, [dispatch]);

  // Opens the node's approval page, where the user signs in with their
  // passkey (or creates an identity). Call it from a click.
  const login = async (serverUrl: string) => {
    const app = await openApp(serverUrl);
    const agent = await app.connect();
    localStorage.setItem('user', JSON.stringify({ serverUrl }));
    await startSession(app, agent, serverUrl);
  };

  const logout = () => {
    localStorage.removeItem('user');
    endSession();
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
