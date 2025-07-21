import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Key, Server, ArrowRight, RefreshCw } from 'lucide-react';
import '../components/login/LoginPage.scss';

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
    // Load server URL history from localStorage
    const history = localStorage.getItem('serverUrlHistory');
    if (history) {
      try {
        setServerUrlHistory(JSON.parse(history));
      } catch (error) {
      }
    }
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
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Decentralized Self-Sovereignty Tool</h1>
          <p>Connect to your decentralized identity</p>
        </div>

        <div className="login-form">
          <div className="input-group">
            <label htmlFor="publicKey">
              <Key size={20} />
              Public Key
            </label>
            <div className="input-with-button">
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
                className="generate-button"
                title="Generate random public key"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="serverUrl">
              <Server size={20} />
              Server URL
            </label>
            <div className="input-with-dropdown">
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
                <div className="history-dropdown">
                  {serverUrlHistory.map((url, index) => (
                    <div
                      key={index}
                      className="history-item"
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
            <div className={`error-message ${loginError.includes('server') ? 'server-error' : 'general-error'}`}>
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <div className="error-title">
                  {loginError.includes('connect to the server') || loginError.includes('unreachable') ? 'Connection Error' : 
                   loginError.includes('recognize the API') || loginError.includes('incorrect') ? 'Invalid Server' : 'Login Error'}
                </div>
                <div className="error-description">{loginError}</div>
                {(loginError.includes('unreachable') || loginError.includes('connection')) && (
                  <button 
                    onClick={() => setLoginError(null)}
                    className="retry-button"
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
            className="login-button"
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