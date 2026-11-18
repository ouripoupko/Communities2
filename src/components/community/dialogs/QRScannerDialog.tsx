import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { decodeCommunityInvitation } from '../../../services/encodeDecode';
import { useAppSelector } from '../../../store/hooks';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';
import styles from './QRScannerDialog.module.scss';

interface QRScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
}

interface ScanResult {
  isValid: boolean;
  isMember: boolean;
  agent: string;
  server: string;
  contract: string;
  memberProfile?: {
    firstName?: string;
    lastName?: string;
    userPhoto?: string;
  };
}

const QRScannerDialog: React.FC<QRScannerDialogProps> = ({
  isOpen,
  onClose,
  communityId
}) => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { communityMembers, profiles } = useAppSelector(state => state.communities);
  const { contracts } = useAppSelector(state => state.user);
  const handleScanResult = async (codes: { rawValue: string }[]) => {
    if (codes && codes.length > 0 && codes[0].rawValue) {
      const qrData = codes[0].rawValue;
      setIsValidating(true);
      setScanResult(null);

      try {
        // Decode the QR code
        const decoded = decodeCommunityInvitation(qrData);
        
        if (!decoded) {
          setScanResult({
            isValid: false,
            isMember: false,
            agent: '',
            server: '',
            contract: ''
          });
          setIsValidating(false);
          return;
        }

        const { server, agent, contract } = decoded;

        // Check if the contract matches the current community
        const currentCommunityContract = contracts.find(c => c.id === communityId);
        const contractMatches = currentCommunityContract?.id === contract;

        // Check if the agent is a member of this community
        const communityMembersList = communityMembers[communityId] || [];
        const isMember = communityMembersList.includes(agent);

        // Get member profile if available
        const memberProfile = profiles[agent];

        setScanResult({
          isValid: true,
          isMember: isMember && contractMatches,
          agent,
          server,
          contract,
          memberProfile: memberProfile ? {
            firstName: memberProfile.firstName,
            lastName: memberProfile.lastName,
            userPhoto: memberProfile.userPhoto
          } : undefined
        });

      } catch (error) {
        console.error('Error processing QR code:', error);
        setScanResult({
          isValid: false,
          isMember: false,
          agent: '',
          server: '',
          contract: ''
        });
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleError = (error: unknown) => {
    console.error('QR Scanner error:', error);
  };

  if (!isOpen) return null;

  return (
    <Modal
      title="Scan Identity Card"
      onClose={onClose}
      actions={(
        <>
          <button className={form.secondaryButton} onClick={onClose}>
            Close Scanner
          </button>
          {scanResult && (
            <button className={form.primaryButton} onClick={() => setScanResult(null)}>
              Scan Again
            </button>
          )}
        </>
      )}
    >
      {!scanResult && !isValidating && (
        <div className={styles.scannerContainer}>
          <Scanner
            onScan={handleScanResult}
            onError={handleError}
            styles={{ 
              container: { 
                width: '100%', 
                height: '400px', 
                background: '#000',
                borderRadius: '8px'
              } 
            }}
          />
        </div>
      )}

      {isValidating && (
        <div className={styles.validating}>
          <div className={styles.spinner}></div>
          <p>Validating identity card...</p>
        </div>
      )}

      {scanResult && (
        <div className={styles.result}>
          {scanResult.isValid && scanResult.isMember ? (
            <div className={styles.successResult}>
              <CheckCircle size={48} className={styles.successIcon} />
              <h3>Authenticated Member</h3>
              <div className={styles.memberInfo}>
                {scanResult.memberProfile?.userPhoto && (
                  <img 
                    src={scanResult.memberProfile.userPhoto} 
                    alt="Member photo"
                    className={styles.memberPhoto}
                  />
                )}
                <div className={styles.memberDetails}>
                  <h4>
                    {scanResult.memberProfile?.firstName && scanResult.memberProfile?.lastName
                      ? `${scanResult.memberProfile.firstName} ${scanResult.memberProfile.lastName}`
                      : 'Member'
                    }
                  </h4>
                  <p className={styles.agentKey}>Agent: {scanResult.agent}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.errorResult}>
              <XCircle size={48} className={styles.errorIcon} />
              <h3>Invalid Identity</h3>
              <p>
                {!scanResult.isValid 
                  ? 'Invalid QR code format'
                  : 'This agent is not a member of this community'
                }
              </p>
              {scanResult.isValid && (
                <div className={styles.details}>
                  <p>Agent: {scanResult.agent}</p>
                  <p>Contract: {scanResult.contract}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.instructions}>
        <p>Point your camera at a printed identity card QR code to verify membership.</p>
      </div>
    </Modal>
  );
};

export default QRScannerDialog;
