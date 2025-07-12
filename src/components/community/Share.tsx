import React from 'react';
import { Copy, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './Share.scss';

interface ShareProps {
  communityId: string;
}

const Share: React.FC<ShareProps> = ({ communityId }) => {
  const communityData = {
    communityId,
    communityName: 'Open Source Contributors',
    serverUrl: 'https://example-server.com',
    description: 'A community for open source developers and contributors',
    memberCount: 156
  };

  const qrData = JSON.stringify(communityData);

  const handleCopyCredentials = () => {
    navigator.clipboard.writeText(qrData);
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
          <h3>Community Details</h3>
          <div className="community-details">
            <div className="detail-item">
              <span className="label">Name:</span>
              <span className="value">{communityData.communityName}</span>
            </div>
            <div className="detail-item">
              <span className="label">Description:</span>
              <span className="value">{communityData.description}</span>
            </div>
            <div className="detail-item">
              <span className="label">Members:</span>
              <span className="value">{communityData.memberCount}</span>
            </div>
            <div className="detail-item">
              <span className="label">Server:</span>
              <span className="value">{communityData.serverUrl}</span>
            </div>
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