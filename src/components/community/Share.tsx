import React from 'react';
import { Copy, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import styles from './Share.module.scss';
import { useAppSelector } from '../../store/hooks';

import { stringToUint8Array, hexToUint8Array, concatUint8Arrays, uint8ArrayToString } from '../../services/encodeDecode';

interface ShareProps {
  communityId: string;
}

const Share: React.FC<ShareProps> = ({ communityId }) => {
  // Get community contract info from Redux
  const { contracts } = useAppSelector(state => state.user);
  const { publicKey } = useAppSelector(state => state.user);
  const communityContract = contracts.find((c: any) => c.id === communityId);
  const server = communityContract?.address || '';
  const agent = publicKey || '';
  const contract = communityContract?.id || '';

  // Only include the three fields needed for sharing
  const credentials = {
    server,
    agent,
    contract,
  };

  // Encode invitation as specified
  const encodeInvitation = () => {
    const s = stringToUint8Array(server || "");
    const a = stringToUint8Array(agent || "");
    const c = hexToUint8Array(contract || "");
    const lengths = new Uint8Array([s.length, a.length, c.length]);
    const all = concatUint8Arrays([lengths, s, a, c]);
    return uint8ArrayToString(all, "latin1");
  };

  const qrData = encodeInvitation();

  const handleCopyCredentials = () => {
    navigator.clipboard.writeText(JSON.stringify(credentials, null, 2));
  };

  const handleDownloadQR = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `community-${communityId}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Share Community</h2>
        <p>Share this community with others via QR code</p>
      </div>

      <div className={styles.content}>
        <div className={styles.qrSection}>
          <h3>Community QR Code</h3>
          <div className={styles.qrCodeContainer}>
            <QRCodeSVG
              value={qrData}
              size={256}
              level="M"
              className={styles.qrCode}
            />
          </div>
          <p className={styles.qrDescription}>
            Scan this QR code to join the community
          </p>
        </div>

        <div className={styles.communityInfoSection}>
          <h3>Community Credentials</h3>
          <div className={styles.communityDetails}>
            <pre className={styles.scrollXNoWrap}>
              {JSON.stringify(credentials, null, 2)}
            </pre>
          </div>
        </div>

        <div className={styles.actionsSection}>
          <div className={styles.actionButtons}>
            <button onClick={handleCopyCredentials} className={styles.actionButton}>
              <Copy size={20} />
              Copy Credentials
            </button>
            <button onClick={handleDownloadQR} className={styles.actionButton}>
              <Download size={20} />
              Download QR Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Share; 