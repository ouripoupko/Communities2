import React from 'react';
import { X } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import styles from './QRScannerDialog.module.scss';

interface QRScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const QRScannerDialog: React.FC<QRScannerDialogProps> = ({
  isOpen,
  onClose
}) => {
  // Debug logging when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      console.log('QR Scanner Dialog opened');
      console.log('QR Scanner Dialog - isOpen:', isOpen);
    } else {
      console.log('QR Scanner Dialog closed');
    }
  }, [isOpen]);
  const handleScanResult = (codes: { rawValue: string }[]) => {
    console.log('QR Scanner - handleScanResult called');
    console.log('QR Scanner - codes received:', codes);
    console.log('QR Scanner - codes length:', codes ? codes.length : 'null/undefined');
    
    if (codes && codes.length > 0) {
      console.log('QR Scanner - First code:', codes[0]);
      console.log('QR Scanner - First code rawValue:', codes[0].rawValue);
      
      if (codes[0].rawValue) {
        const result = codes[0].rawValue;
        console.log('QR Code scanned successfully:', result);
        console.log('QR Code length:', result.length);
        console.log('QR Code type:', typeof result);
        // TODO: Implement verification logic here
      } else {
        console.log('QR Scanner - First code has no rawValue');
      }
    } else {
      console.log('QR Scanner - No codes received or empty array');
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
          <div className={styles.instructions}>
            <p>Point your camera at a printed identity card QR code to verify membership.</p>
          </div>
          <div className={styles.actions}>
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
