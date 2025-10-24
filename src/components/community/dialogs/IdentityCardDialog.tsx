import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import styles from './IdentityCardDialog.module.scss';
import { useAppSelector } from '../../../store/hooks';
import { encodeCommunityInvitation } from '../../../services/encodeDecode';

interface IdentityCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  communityName: string;
}

const IdentityCardDialog: React.FC<IdentityCardDialogProps> = ({
  isOpen,
  onClose,
  communityName
}) => {
  const { contracts, publicKey } = useAppSelector(state => state.user);
  const { profiles } = useAppSelector(state => state.communities);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get community contract info
  const communityContract = contracts.find((c: any) => c.name === communityName);
  const server = communityContract?.address || '';
  const agent = publicKey || '';
  const contract = communityContract?.id || '';

  // Get user profile
  const userProfile = profiles[publicKey || ''] || {};

  const qrData = encodeCommunityInvitation(server, agent, contract);

  const handleDownloadCard = () => {
    if (!cardRef.current) return;

    // Get the card element and convert to canvas first
    const cardElement = cardRef.current;
    
    // Use html2canvas to convert the card to an image
    import('html2canvas').then(html2canvas => {
      html2canvas.default(cardElement, {
        scale: 3, // Higher scale for better quality
        backgroundColor: '#ffffff',
        width: 856, // 85.6mm at 10px/mm
        height: 540, // 54mm at 10px/mm
        useCORS: true,
        allowTaint: true
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Create PDF with exact card dimensions
        // Convert mm to points (1mm = 2.834645669 points)
        const cardWidthPt = 85.6 * 2.834645669;
        const cardHeightPt = 54 * 2.834645669;
        
        const pdf = new jsPDF({
          orientation: cardWidthPt > cardHeightPt ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [cardWidthPt, cardHeightPt]
        });
        
        // Add the card image to fill the entire PDF page
        pdf.addImage(imgData, 'PNG', 0, 0, cardWidthPt, cardHeightPt);
        
        // Download the PDF
        pdf.save(`identity-card-${communityName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2>Identity Card</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.cardContainer}>
            <div className={styles.identityCard} ref={cardRef}>
              <div className={styles.cardHeader}>
                <div className={styles.logo}>
                  <div className={styles.logoIcon}>ID</div>
                </div>
                <div className={styles.title}>
                  <h3>AUTHENTICATED IDENTITY CARD</h3>
                  <p>{communityName} Community</p>
                </div>
              </div>
              
              <div className={styles.cardBody}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberPhoto}>
                    {userProfile.userPhoto ? (
                      <img src={userProfile.userPhoto} alt="Member Photo" />
                    ) : (
                      <div className={styles.photoPlaceholder}>
                        {userProfile.firstName ? userProfile.firstName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.memberDetails}>
                    <div className={styles.memberName}>
                      {userProfile.firstName && userProfile.lastName 
                        ? `${userProfile.firstName} ${userProfile.lastName}` 
                        : 'Unknown Member'}
                    </div>
                    <div className={styles.memberStatement}>
                      This certifies that <strong>{userProfile.firstName && userProfile.lastName 
                        ? `${userProfile.firstName} ${userProfile.lastName}` 
                        : 'this agent'}</strong> is an authenticated member of the <strong>{communityName}</strong> community.
                    </div>
                  </div>
                </div>
                
                <div className={styles.qrSection}>
                  <QRCodeSVG
                    value={qrData}
                    size={120}
                    level="M"
                    className={styles.qrCode}
                  />
                </div>
              </div>
              
              <div className={styles.cardFooter}>
                <div className={styles.memberIdFull}>
                  ID: {agent || 'Unknown'}
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.actions}>
            <button className={styles.downloadButton} onClick={handleDownloadCard}>
              <Download size={18} />
              Download Card
            </button>
            <button className={styles.closeDialogButton} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentityCardDialog;
