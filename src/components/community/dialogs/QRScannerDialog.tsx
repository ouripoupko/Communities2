import React, { useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { decodeCommunityInvitation } from '../../../services/encodeDecode';
import { useAppSelector } from '../../../store/hooks';
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
  // Debug logging when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      console.log('QR Scanner Dialog opened');
      console.log('QR Scanner Dialog - isOpen:', isOpen);
    } else {
      console.log('QR Scanner Dialog closed');
    }
  }, [isOpen]);
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

  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
    console.error('QR Scanner error type:', typeof error);
    console.error('QR Scanner error message:', error?.message);
    console.error('QR Scanner error stack:', error?.stack);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2>Scan Identity Card</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
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
          
          <div className={styles.actions}>
            {scanResult && (
              <button 
                className={styles.scanAgainButton} 
                onClick={() => setScanResult(null)}
              >
                Scan Again
              </button>
            )}
            <button className={styles.closeButton} onClick={onClose}>
              Close Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerDialog;
