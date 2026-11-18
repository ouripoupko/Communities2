import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { openApp } from '../services/ibc';
import { Server, ArrowRight } from 'lucide-react';
import styles from './LoginPage.module.scss';

// If we land here with a stored node URL, the app was disconnected from
// the user's agent (or this browser forgot it) — prefill the form so the
// user can just click Connect again.
function storedServerUrl(): string {
  try {
    const userData = JSON.parse(localStorage.getItem('user') ?? 'null');
    if (typeof userData?.serverUrl === 'string') return userData.serverUrl;
  } catch {
    // Ignore malformed stored data — the field just stays empty.
  }
  return '';
}

// The server URLs used before, the latest first.
function loadServerUrlHistory(): string[] {
  try {
    const history: unknown = JSON.parse(localStorage.getItem('serverUrlHistory') ?? '[]');
    return Array.isArray(history) ? history.filter((url): url is string => typeof url === 'string') : [];
  } catch {
    return [];
  }
}

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [serverUrl, setServerUrl] = useState(storedServerUrl);
  const [serverUrlHistory, setServerUrlHistory] = useState(loadServerUrlHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  // Why the last login attempt failed
  const [loginError, setLoginError] = useState<string | null>(null);
  const [serverUrlError, setServerUrlError] = useState<string | null>(null);


  const validateServerUrl = (value: string): string | null => {
    if (value.length === 0) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:')
        return 'Server URL must use http or https.';
      // Passkeys belong to the node's address, and browsers refuse them at an IP address.
      if (/^[\d.]+$|^\[/.test(url.hostname))
        return 'Use the node\'s name, not an IP address (e.g. http://localhost:2611): passkeys do not work at an IP address.';
      return null;
    } catch {
      return 'Please enter a valid URL (e.g. https://your-server.com).';
    }
  };

  const isValid = serverUrl.length > 0 && validateServerUrl(serverUrl) === null;

  // Load the node's client as soon as the URL is valid: the approval page is
  // a popup, which browsers allow only right after a click, so the click
  // must not wait for the download.
  useEffect(() => {
    if (!isValid) return;
    const timer = setTimeout(() => { openApp(serverUrl).catch(() => {}); }, 400);
    return () => clearTimeout(timer);
  }, [serverUrl, isValid]);

  const handleServerUrlSelect = (url: string) => {
    setServerUrl(url);
    setShowHistory(false);
  };

  const handleLogin = async () => {
    if (isValid) {
      try {
        setLoginError(null);
        setIsConnecting(true);
        
        // Save server URL to history
        const newHistory = [serverUrl, ...serverUrlHistory.filter(url => url !== serverUrl)].slice(0, 10);
        setServerUrlHistory(newHistory);
        localStorage.setItem('serverUrlHistory', JSON.stringify(newHistory));
        
        await login(serverUrl);
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : 'Login failed. Please try again.');
      } finally {
        setIsConnecting(false);
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
            <label htmlFor="serverUrl">
              <Server size={20} />
              Your Node
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
            disabled={!isValid || isConnecting}
            className={`login-button ${styles.loginButton}`}
          >
            <span>{isConnecting ? 'Approve on your node…' : 'Connect'}</span>
            {!isConnecting && <ArrowRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 