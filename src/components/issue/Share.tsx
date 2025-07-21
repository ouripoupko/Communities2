import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download } from 'lucide-react';
import './Share.scss';

interface ShareProps {
  issueId: string;
  server?: string;
  agent?: string;
  communityId?: string;
}

const Share: React.FC<ShareProps> = ({ issueId, server, agent, communityId }) => {
  // Generate the full issue URL for sharing (with encoding for URL structure)
  const generateIssueUrl = () => {
    if (!server || !agent || !communityId) return '';
    const encodedServer = encodeURIComponent(server);
    return `${window.location.origin}/issue/${encodedServer}/${agent}/${communityId}/${issueId}`;
  };

  const issueData = {
    issueId,
    issueTitle: 'Implement new authentication system',
    communityId: 'community-123',
    serverUrl: server || 'https://example-server.com', // Keep original server URL for QR code
    agent: agent || 'example-agent',
    description: 'We need to implement a more secure authentication system that supports OAuth2 and JWT tokens.'
  };

  const qrData = JSON.stringify(issueData);

  const handleCopyCredentials = () => {
    navigator.clipboard.writeText(qrData);
  };

  const handleCopyUrl = () => {
    const issueUrl = generateIssueUrl();
    if (issueUrl) {
      navigator.clipboard.writeText(issueUrl);
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `issue-${issueId}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="share-container">
      <div className="share-header">
        <h2>Share Issue</h2>
        <p>Share this issue with others via QR code</p>
      </div>

      <div className="share-content">
        <div className="qr-section">
          <h3>Issue QR Code</h3>
          <div className="qr-code-container">
            <QRCodeSVG
              value={qrData}
              size={256}
              level="M"
              className="qr-code"
            />
          </div>
          <p className="qr-description">
            Scan this QR code to view the issue
          </p>
        </div>

        <div className="issue-info-section">
          <h3>Issue Details</h3>
          <div className="issue-details">
            <div className="detail-item">
              <span className="label">Title:</span>
              <span className="value">{issueData.issueTitle}</span>
            </div>
            <div className="detail-item">
              <span className="label">Description:</span>
              <span className="value">{issueData.description}</span>
            </div>
            <div className="detail-item">
              <span className="label">Issue ID:</span>
              <span className="value">{issueData.issueId}</span>
            </div>
            <div className="detail-item">
              <span className="label">Community ID:</span>
              <span className="value">{issueData.communityId}</span>
            </div>
            <div className="detail-item">
              <span className="label">Server:</span>
              <span className="value">{issueData.serverUrl}</span>
            </div>
            <div className="detail-item">
              <span className="label">Agent:</span>
              <span className="value">{issueData.agent}</span>
            </div>
          </div>
        </div>

        <div className="actions-section">
          <div className="action-buttons">
            <button onClick={handleCopyCredentials} className="action-button">
              <Copy size={20} />
              Copy Credentials
            </button>
            <button onClick={handleCopyUrl} className="action-button">
              <Copy size={20} />
              Copy URL
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