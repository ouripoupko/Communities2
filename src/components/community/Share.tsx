import React from 'react';
import { Copy, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './Share.scss';
import { useAppSelector } from '../../store/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { stringToUint8Array, hexToUint8Array, concatUint8Arrays, uint8ArrayToString } from '../../services/encodeDecode';

interface ShareProps {
  communityId: string;
}

const Share: React.FC<ShareProps> = ({ communityId }) => {
  // Get community contract info from Redux (or props/context as needed)
  const { contracts } = useAppSelector(state => state.contracts);
  const { user } = useAuth();
  const communityContract = contracts.find(c => c.id === communityId);
  const server = communityContract?.address || '';
  const agent = user?.publicKey || '';
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
    <div className="share-container">
      <div className="share-header">
        <h2>Share Community</h2>
        <p>Share this community with others via QR code</p>
      </div>

      <div className="share-content">
        <div className="qr-section">
          <h3>Community QR Code</h3>
          <div className="qr-code-container">
            <QRCodeSVG
              value={qrData}
              size={256}
              level="M"
              className="qr-code"
            />
          </div>
          <p className="qr-description">
            Scan this QR code to join the community
          </p>
        </div>

        <div className="community-info-section">
          <h3>Community Credentials</h3>
          <div className="community-details">
            <pre className="scroll-x-no-wrap">
              {JSON.stringify(credentials, null, 2)}
            </pre>
          </div>
        </div>

        <div className="actions-section">
          <div className="action-buttons">
            <button onClick={handleCopyCredentials} className="action-button">
              <Copy size={20} />
              Copy Credentials
            </button>
            <button onClick={handleDownloadQR} className="action-button">
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