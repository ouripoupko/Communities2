import React, { useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Get community contract info
  const communityContract = contracts.find((c: any) => c.name === communityName);
  const server = communityContract?.address || '';
  const agent = publicKey || '';
  const contract = communityContract?.id || '';

  // Get user profile
  const userProfile = profiles[publicKey || ''] || {};

  const qrData = encodeCommunityInvitation(server, agent, contract);

  // Function to generate QR code as SVG paths for vector rendering
  const generateQRCodePaths = async (value: string): Promise<Array<{key: number, d: string, fill: string}>> => {
    try {
      console.log('Creating temporary DOM element for QR code...');
      // Create a temporary div to render the QR code
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);
      
      console.log('Rendering QR code to temporary element...');
      // Render QR code to temporary element
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempDiv);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.error('QR code generation timeout');
          root.unmount();
          document.body.removeChild(tempDiv);
          resolve([]);
        }, 5000); // 5 second timeout
        
        root.render(
          <QRCodeSVG value={value} size={80} level="M" />
        );
        
        // Use polling to wait for the SVG to be rendered
        const checkForSVG = () => {
          const svgElement = tempDiv.querySelector('svg');
          if (svgElement) {
            console.log('QR code loaded, extracting paths...');
            clearTimeout(timeout);
            
            const paths = svgElement.querySelectorAll('path');
            const pathData = Array.from(paths).map((path, index) => ({
              key: index,
              d: path.getAttribute('d') || '',
              fill: path.getAttribute('fill') || 'black'
            }));
            
            console.log('Extracted', pathData.length, 'paths from QR code');
            
            // Cleanup
            root.unmount();
            document.body.removeChild(tempDiv);
            resolve(pathData);
          } else {
            // Check again in 100ms
            setTimeout(checkForSVG, 100);
          }
        };
        
        // Start checking for the SVG element
        setTimeout(checkForSVG, 100);
      });
    } catch (error) {
      console.error('Error generating QR code paths:', error);
      return [];
    }
  };

  const handleDownloadCard = async () => {
    try {
      setIsGeneratingPDF(true);
      console.log('Starting PDF download...');
      
      // Lazy load PDF dependencies only when needednpm run dev
      const [{ pdf }, { default: IdentityCardPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./IdentityCardPDF')
      ]);
      
      const memberName = userProfile.firstName && userProfile.lastName 
        ? `${userProfile.firstName} ${userProfile.lastName}` 
        : 'Unknown Member';
      
      const memberInitial = userProfile.firstName ? userProfile.firstName.charAt(0).toUpperCase() : '?';
      
      console.log('Generating QR code paths...');
      // Generate QR code paths for vector rendering
      const qrPaths = await generateQRCodePaths(qrData);
      console.log('QR code paths generated:', qrPaths.length, 'paths');
      
      console.log('Creating PDF document with vector QR code...');
      // Create PDF using react-pdf with vector QR code
      const pdfDoc = (
        <IdentityCardPDF
          communityName={communityName}
          memberName={memberName}
          memberInitial={memberInitial}
          memberPhoto={userProfile.userPhoto}
          qrPaths={qrPaths}
          agentId={agent || 'Unknown'}
        />
      );
      
      console.log('Generating PDF blob...');
      // Generate and download PDF
      const pdfBlob = await pdf(pdfDoc).toBlob();
      console.log('PDF blob generated, size:', pdfBlob.size);
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `identity-card-${communityName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('PDF download completed');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingPDF(false);
    }
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
            <button 
              className={styles.downloadButton} 
              onClick={handleDownloadCard}
              disabled={isGeneratingPDF}
            >
              <Download size={18} />
              {isGeneratingPDF ? 'Generating...' : 'Download Card'}
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
