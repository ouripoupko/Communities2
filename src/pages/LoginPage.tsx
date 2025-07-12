import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Key, Server, ArrowRight, RefreshCw } from 'lucide-react';
import '../components/login/LoginPage.scss';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [publicKey, setPublicKey] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [serverUrlHistory, setServerUrlHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Load server URL history from localStorage
    const history = localStorage.getItem('serverUrlHistory');
    if (history) {
      try {
        setServerUrlHistory(JSON.parse(history));
      } catch (error) {
        console.error('Failed to parse server URL history:', error);
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

  const handleLogin = () => {
    if (isValid) {
      // Save server URL to history
      const newHistory = [serverUrl, ...serverUrlHistory.filter(url => url !== serverUrl)].slice(0, 10);
      setServerUrlHistory(newHistory);
      localStorage.setItem('serverUrlHistory', JSON.stringify(newHistory));
      
      login(publicKey, serverUrl);
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
                onChange={(e) => setServerUrl(e.target.value)}
                onFocus={() => setShowHistory(true)}
                placeholder="https://your-server.com"
                className="input-field"
              />
              {showHistory && serverUrlHistory.length > 0 && (
                <div className="history-dropdown">
                  {serverUrlHistory.map((url, index) => (
                    <div
                      key={index}
                      className="history-item"
                      onClick={() => handleServerUrlSelect(url)}
                    >
                      {url}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={!isValid}
            className="login-button"
          >
            <span>Connect</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 