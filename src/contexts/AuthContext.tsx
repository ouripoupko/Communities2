import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { checkAgentExists, registerAgent, fetchContracts, clearContracts, clearError, APIError, deployProfileContract, PROFILE_CONTRACT_NAME } from '../store/slices/contractsSlice';
import type { AppDispatch } from '../store';

interface User {
  publicKey: string;
  serverUrl: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (publicKey: string, serverUrl: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Check for stored user data on app load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        // Validate stored credentials and load contracts
        validateStoredCredentials(userData.publicKey, userData.serverUrl);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateStoredCredentials = async (publicKey: string, serverUrl: string) => {
    try {
      // First check if agent exists
      let agentExists = false;
      try {
        agentExists = await dispatch(checkAgentExists({ serverUrl, publicKey })).unwrap();
      } catch (error) {
        throw error;
      }
      if (agentExists) {
        let contracts;
        try {
          contracts = await dispatch(fetchContracts({ serverUrl, publicKey })).unwrap();
        } catch (error) {
          throw error;
        }
        // Check if profile contract exists, if not deploy it
        const hasProfileContract = contracts.some(contract => contract.name === PROFILE_CONTRACT_NAME);
        if (!hasProfileContract) {
          try {
            await dispatch(deployProfileContract({ serverUrl, publicKey })).unwrap();
            await dispatch(fetchContracts({ serverUrl, publicKey })).unwrap();
          } catch (error) {
            throw error;
          }
        }
        dispatch(clearError());
        setIsLoading(false);
      } else {
        // Agent does not exist, register it
        try {
          await dispatch(registerAgent({ serverUrl, publicKey })).unwrap();
          await dispatch(deployProfileContract({ serverUrl, publicKey })).unwrap();
          await dispatch(fetchContracts({ serverUrl, publicKey })).unwrap();
          dispatch(clearError());
          setIsLoading(false);
        } catch (error) {
          throw error;
        }
      }
    } catch (error) {
      // Fail fast: show error, clear state, and exit
      setUser(null);
      localStorage.removeItem('user');
      dispatch(clearContracts());
      setIsLoading(false);
      if (error instanceof APIError) {
        if (error.isNetworkError) {
          localStorage.setItem('loginError', 'Your previous session could not be restored because the server is unreachable. Please check your connection and try again.');
        } else if (error.isInvalidServer) {
          localStorage.setItem('loginError', 'Your previous session could not be restored because the server URL appears to be incorrect. Please check the server URL and try again.');
        } else {
          localStorage.setItem('loginError', 'Your previous session could not be restored. Please log in again.');
        }
      } else {
        localStorage.setItem('loginError', 'Your previous session could not be restored. Please log in again.');
      }
      return; // Do not proceed further
    }
  };

  const handleLoadContracts = async (publicKey: string, serverUrl: string) => {
    // First check if agent exists
    let agentExists = false;
    try {
      agentExists = await dispatch(checkAgentExists({ serverUrl, publicKey })).unwrap();
    } catch (error) {
      // Fail fast: show error and exit
      throw error;
    }
    if (agentExists) {
      let contracts;
      try {
        contracts = await dispatch(fetchContracts({ serverUrl, publicKey })).unwrap();
      } catch (error) {
        // Fail fast: show error and exit
        throw error;
      }
      const hasProfileContract = contracts.some(contract => contract.name === PROFILE_CONTRACT_NAME);
      if (!hasProfileContract) {
        try {
          await dispatch(deployProfileContract({ serverUrl, publicKey })).unwrap();
          await dispatch(fetchContracts({ serverUrl, publicKey })).unwrap();
        } catch (error) {
          // Fail fast: show error and exit
          throw error;
        }
      }
      dispatch(clearError());
    } else {
      // Agent does not exist, register it
      try {
        await dispatch(registerAgent({ serverUrl, publicKey })).unwrap();
        await dispatch(deployProfileContract({ serverUrl, publicKey })).unwrap();
        await dispatch(fetchContracts({ serverUrl, publicKey })).unwrap();
        dispatch(clearError());
      } catch (error) {
        // Fail fast: show error and exit
        throw error;
      }
    }
  };

  const login = async (publicKey: string, serverUrl: string) => {
    try {
      setIsLoading(true);
      
      // Clear any existing contracts
      dispatch(clearContracts());
      
      // Handle the login flow with API calls
      await handleLoadContracts(publicKey, serverUrl);
      
      const newUser: User = { publicKey, serverUrl };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Login failed:', error);
      
      // Provide specific error messages based on error type
      if (error instanceof APIError) {
        if (error.isNetworkError) {
          throw new Error('Unable to connect to the server. Please check if the server is running and the URL is correct.');
        } else if (error.isInvalidServer) {
          throw new Error('The server doesn\'t recognize the API endpoints. Please check if this is the correct server URL.');
        } else {
          throw new Error(error.message);
        }
      } else {
        throw new Error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    dispatch(clearContracts());
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 