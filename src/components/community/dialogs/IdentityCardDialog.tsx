import React, { useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import styles from './IdentityCardDialog.module.scss';
import { useAppSelector } from '../../../store/hooks';
import { encodeCommunityInvitation } from '../../../services/encodeDecode';
import IdentityCardSVG from './IdentityCardSVG';
import { generateIdentityCardPDF } from './IdentityCardPDFGenerator';

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

  const handleDownloadCard = async () => {
    try {
      setIsGeneratingPDF(true);
      console.log('Starting PDF download...');
      
      const memberName = userProfile.firstName && userProfile.lastName 
        ? `${userProfile.firstName} ${userProfile.lastName}` 
        : 'Unknown Member';
      
      const memberInitial = userProfile.firstName ? userProfile.firstName.charAt(0).toUpperCase() : '?';
      
      console.log('Generating PDF from SVG...');
      // Generate PDF directly from SVG using svg2pdf
      const pdfBlob = await generateIdentityCardPDF({
        communityName,
        memberName,
        memberInitial,
        memberPhoto: userProfile.userPhoto,
        agentId: agent || 'Unknown',
        qrData,
      });
      
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
            <div ref={cardRef}>
              <IdentityCardSVG
                communityName={communityName}
                memberName={userProfile.firstName && userProfile.lastName 
                  ? `${userProfile.firstName} ${userProfile.lastName}` 
                  : 'Unknown Member'}
                memberInitial={userProfile.firstName ? userProfile.firstName.charAt(0).toUpperCase() : '?'}
                memberPhoto={userProfile.userPhoto}
                agentId={agent || 'Unknown'}
                qrData={qrData}
                width={428}
                height={270}
              />
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
