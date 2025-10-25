import React, { useState, useEffect } from 'react';
import { QrCode, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './JoinCommunity.module.scss';
import { Scanner } from '@yudiel/react-qr-scanner';
import { decodeCommunityInvitation } from '../../services/encodeDecode';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchContracts } from '../../store/slices/userSlice';
import { eventStreamService } from '../../services/eventStream';
import type { BlockchainEvent } from '../../services/eventStream';
import { useNavigate } from 'react-router-dom';
import { joinContract, contractWrite } from '../../services/api';

// No longer using CommunityInvite type; use plain object with server, agent, contract
const JoinCommunity: React.FC = () => {
  const { publicKey, serverUrl, profileContractId } = useAppSelector(state => state.user);
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
  const a2aListenerRef = React.useRef<((event: BlockchainEvent) => void) | null>(null);

  // Register a2a_connect listener on mount and cleanup on unmount
  useEffect(() => {
    const handleA2AConnect = async () => {
      if (isJoining && parsedInvite) {
        setIsResetting(true);
        setIsJoining(false);
        
        try {
          // Call request_join on the community contract
          if (serverUrl && publicKey && parsedInvite.contract) {
            await contractWrite({
              serverUrl: serverUrl,
              publicKey: publicKey,
              contractId: parsedInvite.contract,
              method: 'request_join',
              args: {}
            });
          }
          
          // Refresh contracts list from server and wait for it to complete
          if (serverUrl && publicKey) {
            await dispatch(fetchContracts());
          }
        } catch (error) {
          console.error('Failed to call request_join:', error);
          // Continue with the flow even if request_join fails
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
     
  }, [isJoining, parsedInvite, dispatch, navigate, publicKey, serverUrl]);

  const handleScanQR = () => {
    setShowScanner(true);
  };

  const handleScanResult = (codes: { rawValue: string }[]) => {
    if (codes && codes.length > 0 && codes[0].rawValue) {
      const result = codes[0].rawValue;
      setShowScanner(false);
      
      // Use the shared decoding function
      const decoded = decodeCommunityInvitation(result);
      if (decoded) {
        setParsedInvite(decoded);
        setDecodedData(JSON.stringify(decoded, null, 2));
      } else {
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
    if (!parsedInvite || !serverUrl || !publicKey) return;
    const { server, agent, contract } = parsedInvite;
    if (!server || !agent || !contract) return;
    setIsJoining(true);
    setJoinSuccess(false);
    try {
      await joinContract({
        serverUrl: serverUrl,
        publicKey: publicKey,
        address: server,
        agent,
        contract,
        profile: profileContractId || ''
      });
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Join Community</h1>
        <p>Scan a QR code or manually enter community credentials</p>
      </div>

      <div className={styles.content}>
        <div className={styles.scanSection}>
          <h3>Scan QR Code</h3>
          <div className={styles.scanArea}>
            {showScanner ? (
              <div className={styles.scannerModal}>
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
              <div className={styles.qrPlaceholder}>
                <QrCode size={64} />
                <p>QR code scanner placeholder</p>
                <button
                  onClick={handleScanQR}
                  className={styles.scanButton}
                >
                  <Camera size={20} />
                  Scan QR Code
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.manualInputSection}>
          <h3>Manual Input</h3>
          <div className="form-group">
            <label htmlFor="qrData">Community Credentials (JSON)</label>
            <textarea
              id="qrData"
              value={decodedData}
              onChange={handleManualInput}
              placeholder="Paste community credentials here as JSON..."
              className={`input-field ${styles.scrollXNoWrap}`}
              rows={6}
            />
          </div>
        </div>

        {parsedInvite && (
          <div className={styles.joinActions}>
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
              className={styles.joinButton}
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