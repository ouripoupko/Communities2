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
  const [showHelp, setShowHelp] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null);
  const [serverUrlError, setServerUrlError] = useState<string | null>(null);

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
    if (!serverUrl) {
      setServerUrl(defaultServer);
    }
  }, []);

  const validatePublicKey = (value: string): string | null => {
    if (value.length === 0) return null;
    if (!/^[A-Za-z0-9]{64}$/.test(value))
      return 'Your identity key must be exactly 64 alphanumeric characters (letters and digits only).';
    return null;
  };

  const validateServerUrl = (value: string): string | null => {
    if (value.length === 0) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:')
        return 'Server URL must use http or https.';
      return null;
    } catch {
      return 'Please enter a valid URL (e.g. https://your-server.com).';
    }
  };

  useEffect(() => {
    const pkErr = validatePublicKey(publicKey);
    const srvErr = validateServerUrl(serverUrl);
    setIsValid(
      publicKey.length > 0 && pkErr === null &&
      serverUrl.length > 0 && srvErr === null
    );
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
          <h1>Welcome to Gloki</h1>
          <p>Global direct democracy — connect to participate</p>
          <button className={styles.helpToggle} onClick={() => setShowHelp(v => !v)}>
            {showHelp ? 'Hide details' : 'How does this work?'}
          </button>
          {showHelp && (
            <div className={styles.helpBox}>
              <p>Gloki uses public keys instead of passwords. Your public key is your identity across all communities. You can generate a new one with the button below, or enter an existing one to reconnect.</p>
              <p>The server URL connects you to a Gloki network. The default server is already set for you.</p>
            </div>
          )}
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="publicKey">
              <Key size={20} />
              Your Identity Key
              <span className={styles.fieldHint}>A 64-character code that identifies you. New here? Click the generate button.</span>
            </label>
            <div className={styles.inputWithButton}>
              <input
                id="publicKey"
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                onBlur={() => setPublicKeyError(validatePublicKey(publicKey))}
                placeholder="Enter your public key"
                className="input-field"
              />
              <button
                type="button"
                onClick={generateRandomKey}
                className={styles.generateButton}
                title="Generate a new identity key"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            {publicKeyError && <div className={styles.fieldError}>{publicKeyError}</div>}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="serverUrl">
              <Server size={20} />
              Server URL
              <span className={styles.fieldHint}>The default server is pre-selected. Most users won't need to change this.</span>
            </label>
            <div className={styles.inputWithDropdown}>
              <input
                id="serverUrl"
                type="url"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setShowHistory(false);
                }}
                onFocus={() => setShowHistory(true)}
                onBlur={() => {
                  setShowHistory(false);
                  setServerUrlError(validateServerUrl(serverUrl));
                }}
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
            {serverUrlError && <div className={styles.fieldError}>{serverUrlError}</div>}
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
            <span>{isLoading ? 'Connecting...' : 'Get Started'}</span>
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 