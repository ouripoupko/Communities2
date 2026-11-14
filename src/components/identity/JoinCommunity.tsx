import React, { useState } from 'react';
import { QrCode, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './JoinCommunity.module.scss';
import { Scanner } from '@yudiel/react-qr-scanner';
import { decodeCommunityInvitation } from '../../services/encodeDecode';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchContracts } from '../../store/slices/userSlice';
import { useNavigate } from 'react-router-dom';
import { hasCommunityContract, joinCommunityContract, joinCommunity } from '../../services/contracts/community';
import { needsAccess } from '../../services/ibc';

type Invite = { server: string; agent: string; contract: string };

// Joining takes one approval on the user's node: the join of the community's
// contract (as a partner or as a guest), and this app's permissions. Then the
// user becomes a member: silently, if they let the app call join(), or else
// with the Members page's button.

const JoinCommunity: React.FC = () => {
  const { serverUrl, profileContractId } = useAppSelector(state => state.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [scannedData, setScannedData] = useState<string>('');
  const [parsedInvite, setParsedInvite] = useState<Invite | null>(null);
  const [asGuest, setAsGuest] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A join whose source the user's node could not check: the contract to open, and why.
  const [unchecked, setUnchecked] = useState<{ contract: string; reason?: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  // Store decoded data for display and editing
  const [decodedData, setDecodedData] = useState('');

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

  // Runs one step, showing its error, if any.
  const run = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  };

  const openCommunity = async (contract: string, page = '') => {
    await dispatch(fetchContracts());
    navigate(`/community/${contract}${page}`, { replace: true });
  };

  // Becomes a member without asking, if the user allowed it in the join's
  // approval; otherwise the Members page's button does it.
  const becomeMember = async (contract: string) => {
    try {
      await joinCommunity(contract, serverUrl!, profileContractId, { silently: true });
    } catch (err) {
      if (needsAccess(err)) {
        await openCommunity(contract, '/members');
        return;
      }
      console.warn('Could not become a member:', err);
    }
    await openCommunity(contract);
  };

  // Opens the node's approval page, so it must start from this click.
  const handleJoinContract = () => run(async () => {
    if (!parsedInvite || !serverUrl) return;
    const { server, agent, contract } = parsedInvite;
    // The user may have joined before: then only open the community.
    if (await hasCommunityContract(contract)) {
      await openCommunity(contract);
      return;
    }
    const outcome = await joinCommunityContract(contract, server, agent, asGuest);
    if (!outcome.joined) {
      throw new Error(outcome.reason ? `The join did not go through: ${outcome.reason}.` : 'The community did not accept you.');
    }
    if (outcome.sourceCheck === 'unchecked') {
      setUnchecked({ contract, reason: outcome.reason });
      return;
    }
    await becomeMember(contract);
  });

  const handleContinueUnchecked = () => run(async () => {
    if (unchecked) await becomeMember(unchecked.contract);
  });

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
    } catch {
      setParsedInvite(null);
    }
  };

  const busyLabel = (
    <>
      <div className={styles.loadingSpinnerSmall}></div>
      Joining… approve on your node
    </>
  );

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.introLine}>Scan a QR code or manually enter community credentials.</p>
        <div className={styles.scanSection}>
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

        <label className={styles.roleOption}>
          <input type="checkbox" checked={asGuest} onChange={(e) => setAsGuest(e.target.checked)} />
          <span>
            Join as a guest: your node keeps no copy of the community, and uses the inviting member's
            node instead, which you trust with your reads and transactions.
          </span>
        </label>

        <div className={styles.joinActions}>
          <button
            onClick={handleJoinContract}
            disabled={
              isBusy ||
              !parsedInvite ||
              !parsedInvite?.server ||
              !parsedInvite?.agent ||
              !parsedInvite?.contract
            }
            className={styles.joinButton}
          >
            {isBusy ? busyLabel : (
              <>
                <CheckCircle size={16} />
                Join Community
              </>
            )}
          </button>
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

        {unchecked && (
          <div className={styles.errorMessage}>
            <AlertCircle size={24} />
            <h4>You joined, but your node could not check the community's code</h4>
            <p>
              It could not compile the community's source to compare it with the code that runs
              {unchecked.reason ? ` (${unchecked.reason})` : ''}. The members accepted the source
              you approved, but your node has not verified that the code matches it.
            </p>
            <button onClick={handleContinueUnchecked} className="edit-button" disabled={isBusy}>
              Continue to the community
            </button>
          </div>
        )}

        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={24} />
            <h4>Could not join</h4>
            <p>{error}</p>
          </div>
        )}

        {scannedData && !parsedInvite && (
          <div className={styles.errorMessage}>
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
