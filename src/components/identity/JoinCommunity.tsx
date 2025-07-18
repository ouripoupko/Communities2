import React, { useState, useEffect } from 'react';
import { QrCode, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import './JoinCommunity.scss';
import { Scanner } from '@yudiel/react-qr-scanner';
import { stringToUint8Array, uint8ArrayToString, uint8ArrayToHex } from '../../services/encodeDecode';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch } from '../../store/hooks';
import { fetchContracts } from '../../store/slices/contractsSlice';
import { eventStreamService } from '../../services/eventStream';
import { useNavigate } from 'react-router-dom';

// No longer using CommunityInvite type; use plain object with server, agent, contract
const JoinCommunity: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [scannedData, setScannedData] = useState<string>('');
  const [parsedInvite, setParsedInvite] = useState<{ server: string; agent: string; contract: string } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  // Store decoded data for display and editing
  const [decodedData, setDecodedData] = useState('');
  const a2aListenerRef = React.useRef<((event: any) => void) | null>(null);

  // Register a2a_connect listener on mount and cleanup on unmount
  useEffect(() => {
    const handleA2AConnect = async () => {
      if (isJoining) {
        setIsResetting(true);
        setIsJoining(false);
        // Refresh contracts list from server and wait for it to complete
        if (user?.serverUrl && user?.publicKey) {
          await dispatch(fetchContracts({ serverUrl: user.serverUrl, publicKey: user.publicKey }));
        }
        // Reset all fields
        setScannedData('');
        setParsedInvite(null); // This disables the button
        setDecodedData('');
        setJoinSuccess(false);
        setIsResetting(false);
        // Redirect to communities tab using react-router
        navigate('/identity/communities', { replace: true });
      }
    };
    a2aListenerRef.current = handleA2AConnect;
    eventStreamService.addEventListener('a2a_connect', handleA2AConnect);
    return () => {
      if (a2aListenerRef.current) {
        eventStreamService.removeEventListener('a2a_connect', a2aListenerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJoining, dispatch, navigate, user]);

  const handleScanQR = () => {
    setShowScanner(true);
  };

  const handleScanResult = (codes: any[]) => {
    if (codes && codes.length > 0 && codes[0].rawValue) {
      const result = codes[0].rawValue;
      setShowScanner(false);
      try {
        // Decode using the provided logic
        const data = stringToUint8Array(result, "latin1");
        const lengths = data.slice(0, 3);
        const indexes = Array.from(lengths).reduce((acc, curr) => [...acc, acc[acc.length - 1] + curr], [3]);
        const server = uint8ArrayToString(data.slice(indexes[0], indexes[1]), "ascii");
        const agent = uint8ArrayToString(data.slice(indexes[1], indexes[2]), "ascii");
        const contract = uint8ArrayToHex(data.slice(indexes[2], indexes[3]));
        const decoded = { server, agent, contract };
        setParsedInvite(decoded);
        setDecodedData(JSON.stringify(decoded, null, 2));
      } catch (error) {
        setParsedInvite(null);
        setDecodedData('');
      }
      setScannedData(result);
    }
  };

  const handleScannerClose = () => {
    setShowScanner(false);
  };

  const handleJoinCommunity = async () => {
    if (!parsedInvite || !user || !user.serverUrl || !user.publicKey) return;
    const { server, agent, contract } = parsedInvite;
    if (!server || !agent || !contract) return;
    setIsJoining(true);
    setJoinSuccess(false);
    try {
      const url = `${user.serverUrl}/ibc/app/${user.publicKey}?action=join_contract`;
      const body = JSON.stringify({
        address: server,
        agent,
        contract,
        profile: ""
      });
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (!response.ok) throw new Error('Failed to join community');
      // Button remains disabled until a2a_connect is received
    } catch (error) {
      setIsJoining(false);
      setJoinSuccess(false);
      alert('Failed to join community: ' + (error instanceof Error ? error.message : error));
    }
  };

  // When user manually enters data, treat it as decoded JSON with only the three fields
  const handleManualInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setDecodedData(value);
    try {
      const parsed = JSON.parse(value);
      if (parsed.server && parsed.agent && parsed.contract) {
        setParsedInvite(parsed);
      } else {
        setParsedInvite(null);
      }
    } catch (error) {
      setParsedInvite(null);
    }
  };

  return (
    <div className="join-community-container">
      <div className="join-header">
        <h1>Join Community</h1>
        <p>Scan a QR code or manually enter community credentials</p>
      </div>

      <div className="join-content">
        <div className="scan-section">
          <h3>Scan QR Code</h3>
          <div className="scan-area">
            {showScanner ? (
              <div className="scanner-modal">
                <Scanner
                  onScan={handleScanResult}
                  onError={() => {}}
                  styles={{ container: { width: '100%', height: 320, background: '#000' } }}
                />
                <button onClick={handleScannerClose} className="cancel-button" style={{ marginTop: 16 }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="qr-placeholder">
                <QrCode size={64} />
                <p>QR code scanner placeholder</p>
                <button
                  onClick={handleScanQR}
                  className="scan-button"
                >
                  <Camera size={20} />
                  Scan QR Code
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="manual-input-section">
          <h3>Manual Input</h3>
          <div className="form-group">
            <label htmlFor="qrData">Community Credentials (JSON)</label>
            <textarea
              id="qrData"
              value={decodedData}
              onChange={handleManualInput}
              placeholder="Paste community credentials here as JSON..."
              className="input-field scroll-x-no-wrap"
              rows={6}
            />
          </div>
        </div>

        {parsedInvite && (
          <div className="join-actions">
            <button
              onClick={handleJoinCommunity}
              disabled={
                isJoining ||
                isResetting ||
                !parsedInvite ||
                !parsedInvite.server ||
                !parsedInvite.agent ||
                !parsedInvite.contract
              }
              className="join-button"
            >
              {isJoining ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Joining... Waiting for confirmation
                </>
              ) : isResetting ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Resetting...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Join Community
                </>
              )}
            </button>
          </div>
        )}

        {joinSuccess && (
          <div className="success-message">
            <CheckCircle size={24} />
            <h4>Successfully joined community!</h4>
            <p>You can now access the community from your Communities page.</p>
          </div>
        )}

        {scannedData && !parsedInvite && (
          <div className="error-message">
            <AlertCircle size={24} />
            <h4>Invalid QR Code Data</h4>
            <p>The scanned data doesn't contain valid community credentials.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinCommunity; 