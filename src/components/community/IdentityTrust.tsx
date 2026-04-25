import React, { useState, Suspense, lazy } from 'react';
import { IdCard, QrCode, Share2 } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import styles from './IdentityTrust.module.scss';

const IdentityCardDialog = lazy(() => import('./dialogs/IdentityCardDialog'));
const QRScannerDialog = lazy(() => import('./dialogs/QRScannerDialog'));
const Share = lazy(() => import('./Share'));

interface IdentityTrustProps {
  communityId: string;
}

const IdentityTrust: React.FC<IdentityTrustProps> = ({ communityId }) => {
  const { communityMembers, communityProperties } = useAppSelector((s) => s.communities);
  const { publicKey } = useAppSelector((s) => s.user);

  const [showIdentityCard, setShowIdentityCard] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const isMember = publicKey && allMembers.includes(publicKey);
  const communityName = communityProperties[communityId]?.name || 'Community';

  if (!isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h2>Identity & Trust</h2>
          <p>You must be a member of this community to access identity features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h2>Identity & Trust</h2>
        <p>
          Gloki uses a web of trust to verify community members. By scanning each other's QR codes
          and confirming real-world identity, you strengthen the trust network within your community.
          The more verified connections you have, the stronger your community's democratic foundation.
        </p>
      </div>

      <div className={styles.trustSection}>
        <div className={styles.trustActions}>
          <button className={styles.trustBtn} onClick={() => setShowIdentityCard(true)}>
            <IdCard size={18} />
            <span>My ID Card</span>
          </button>
          <button className={styles.trustBtn} onClick={() => setShowQRScanner(true)}>
            <QrCode size={18} />
            <span>Scan Member</span>
          </button>
          <button className={styles.trustBtn} onClick={() => setShowShare((v) => !v)}>
            <Share2 size={18} />
            <span>Share</span>
          </button>
        </div>
        {showShare && (
          <div className={styles.shareEmbed}>
            <Suspense fallback={<p>Loading...</p>}>
              <Share communityId={communityId} />
            </Suspense>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <IdentityCardDialog
          isOpen={showIdentityCard}
          onClose={() => setShowIdentityCard(false)}
          communityName={communityName}
        />
        <QRScannerDialog
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          communityId={communityId}
        />
      </Suspense>
    </div>
  );
};

export default IdentityTrust;
