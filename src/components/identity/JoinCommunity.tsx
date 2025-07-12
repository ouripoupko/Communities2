import React, { useState } from 'react';
import { QrCode, Camera, Users, CheckCircle, AlertCircle } from 'lucide-react';
import './JoinCommunity.scss';

interface CommunityInvite {
  communityId: string;
  communityName: string;
  serverUrl: string;
  description: string;
  memberCount: number;
}

const JoinCommunity: React.FC = () => {
  const [scannedData, setScannedData] = useState<string>('');
  const [parsedInvite, setParsedInvite] = useState<CommunityInvite | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const handleScanQR = () => {
    setIsScanning(true);
    // Mock QR code scanning - in real app this would use a camera
    setTimeout(() => {
      const mockQRData = JSON.stringify({
        communityId: 'remote-community-123',
        communityName: 'Remote Development Team',
        serverUrl: 'https://remote-server.com',
        description: 'A distributed team working on innovative projects',
        memberCount: 45
      });
      setScannedData(mockQRData);
      try {
        const parsed = JSON.parse(mockQRData);
        setParsedInvite(parsed);
      } catch (error) {
        console.error('Failed to parse QR data:', error);
      }
      setIsScanning(false);
    }, 2000);
  };

  const handleJoinCommunity = async () => {
    if (!parsedInvite) return;

    setIsJoining(true);
    // Mock API call to join community
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setJoinSuccess(true);
    setIsJoining(false);
    
    // Reset after showing success
    setTimeout(() => {
      setJoinSuccess(false);
      setScannedData('');
      setParsedInvite(null);
    }, 3000);
  };

  const handleManualInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setScannedData(value);
    
    try {
      const parsed = JSON.parse(value);
      setParsedInvite(parsed);
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
            {isScanning ? (
              <div className="scanning-overlay">
                <div className="scanning-animation">
                  <Camera size={48} />
                </div>
                <p>Scanning QR code...</p>
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
              value={scannedData}
              onChange={handleManualInput}
              placeholder="Paste community credentials here..."
              className="input-field"
              rows={6}
            />
          </div>
        </div>

        {parsedInvite && (
          <div className="invite-preview">
            <h3>Community Preview</h3>
            <div className="community-preview-card">
              <div className="preview-header">
                <div className="preview-icon">
                  <Users size={24} />
                </div>
                <div className="preview-info">
                  <h4>{parsedInvite.communityName}</h4>
                  <p>{parsedInvite.description}</p>
                </div>
              </div>
              
              <div className="preview-details">
                <div className="detail-item">
                  <span className="label">Server:</span>
                  <span className="value">{parsedInvite.serverUrl}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Members:</span>
                  <span className="value">{parsedInvite.memberCount}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Community ID:</span>
                  <span className="value">{parsedInvite.communityId}</span>
                </div>
              </div>

              <div className="join-actions">
                <button
                  onClick={handleJoinCommunity}
                  disabled={isJoining}
                  className="join-button"
                >
                  {isJoining ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Join Community
                    </>
                  )}
                </button>
              </div>
            </div>
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