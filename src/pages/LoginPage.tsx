import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Key, Server, ArrowRight, RefreshCw } from 'lucide-react';
import styles from './LoginPage.module.scss';

const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [publicKey, setPublicKey] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [serverUrlHistory, setServerUrlHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check for stored error messages on component mount
  useEffect(() => {
    const storedError = localStorage.getItem('loginError');
    if (storedError) {
      setLoginError(storedError);
      localStorage.removeItem('loginError'); // Clear the stored error
    }
  }, []);

  useEffect(() => {
    // Default server URL
    const defaultServer = 'https://gdi.gloki.contact';
    
    // Load server URL history from localStorage
    const history = localStorage.getItem('serverUrlHistory');
    let historyArray: string[] = [];
    
    if (history) {
      try {
        historyArray = JSON.parse(history);
      } catch (error) {
        historyArray = [];
      }
    }
    
    // Always ensure default server is in the list
    if (!historyArray.includes(defaultServer)) {
      historyArray = [defaultServer, ...historyArray];
    } else {
      // Move default server to the top if it's already in the list
      historyArray = [defaultServer, ...historyArray.filter(url => url !== defaultServer)];
    }
    
    setServerUrlHistory(historyArray);
  }, []);

  useEffect(() => {
    // Validate inputs
    const isValidPublicKey = publicKey.trim().length > 0;
    const isValidServerUrl = serverUrl.trim().length > 0 && 
      (serverUrl.startsWith('http://') || serverUrl.startsWith('https://'));
    setIsValid(isValidPublicKey && isValidServerUrl);
  }, [publicKey, serverUrl]);

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPublicKey(result);
  };

  const handleServerUrlSelect = (url: string) => {
    setServerUrl(url);
    setShowHistory(false);
  };

  const handleLogin = async () => {
    if (isValid) {
      try {
        setLoginError(null);
        
        // Save server URL to history
        const newHistory = [serverUrl, ...serverUrlHistory.filter(url => url !== serverUrl)].slice(0, 10);
        setServerUrlHistory(newHistory);
        localStorage.setItem('serverUrlHistory', JSON.stringify(newHistory));
        
        await login(publicKey, serverUrl);
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : 'Login failed. Please try again.');
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Decentralized Self-Sovereignty Tool</h1>
          <p>Connect to your decentralized identity</p>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="publicKey">
              <Key size={20} />
              Public Key
            </label>
            <div className={styles.inputWithButton}>
              <input
                id="publicKey"
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Enter your public key"
                className="input-field"
              />
              <button
                type="button"
                onClick={generateRandomKey}
                className={styles.generateButton}
                title="Generate random public key"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="serverUrl">
              <Server size={20} />
              Server URL
            </label>
            <div className={styles.inputWithDropdown}>
              <input
                id="serverUrl"
                type="url"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setShowHistory(false); // Hide dropdown when editing after selection
                }}
                onFocus={() => setShowHistory(true)}
                onBlur={() => setShowHistory(false)}
                placeholder="https://your-server.com"
                className="input-field"
                autoComplete="off"
              />
              {showHistory && serverUrlHistory.length > 0 && (
                <div className={styles.historyDropdown}>
                  {serverUrlHistory.map((url, index) => (
                    <div
                      key={index}
                      className={styles.historyItem}
                      onMouseDown={() => handleServerUrlSelect(url)} // Use onMouseDown so it fires before blur
                    >
                      {url}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loginError && (
            <div className={`${styles.errorMessage} ${loginError.includes('server') ? styles.serverError : styles.generalError}`}>
              <div className={styles.errorIcon}>⚠️</div>
              <div className={styles.errorContent}>
                <div className={styles.errorTitle}>
                  {loginError.includes('connect to the server') || loginError.includes('unreachable') ? 'Connection Error' : 
                   loginError.includes('recognize the API') || loginError.includes('incorrect') ? 'Invalid Server' : 'Login Error'}
                </div>
                <div className={styles.errorDescription}>{loginError}</div>
                {(loginError.includes('unreachable') || loginError.includes('connection')) && (
                  <button 
                    onClick={() => setLoginError(null)}
                    className={styles.retryButton}
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogin}
            disabled={!isValid || isLoading}
            className={`login-button ${styles.loginButton}`}
          >
            <span>{isLoading ? 'Connecting...' : 'Connect'}</span>
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 