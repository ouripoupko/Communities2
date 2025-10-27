import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createRoot } from 'react-dom/client';

interface IdentityCardSVGProps {
  communityName: string;
  memberName: string;
  memberInitial: string;
  memberPhoto?: string;
  agentId: string;
  qrData: string;
  width?: number;
  height?: number;
  onRenderComplete?: () => void;
}

const IdentityCardSVG: React.FC<IdentityCardSVGProps> = ({
  communityName,
  memberName,
  memberInitial,
  memberPhoto,
  agentId,
  qrData,
  width = 428,
  height = 270,
  onRenderComplete
}) => {
  // Calculate dimensions and positions
  const cardWidth = width;
  const cardHeight = height;
  const headerHeight = 60;
  const footerHeight = 40;
  const bodyHeight = cardHeight - headerHeight - footerHeight;
  
  // State for QR code paths
  const [qrPaths, setQrPaths] = useState<Array<{key: number, d: string, fill: string}>>([]);
  
  // Function to generate QR code as SVG paths
  const generateQRCodePaths = async (value: string): Promise<Array<{key: number, d: string, fill: string}>> => {
    try {
      // Create a temporary div to render the QR code
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);
      
      // Render QR code to temporary element
      const root = createRoot(tempDiv);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.error('QR code generation timeout');
          observer.disconnect();
          root.unmount();
          document.body.removeChild(tempDiv);
          resolve([]);
        }, 5000); // 5 second timeout
        
        // Create MutationObserver to watch for SVG element
        const observer = new MutationObserver(() => {
          const svgElement = tempDiv.querySelector('svg');
          if (svgElement) {
            console.log('SVG element 1 found via MutationObserver');
            clearTimeout(timeout);
            observer.disconnect();
            
            const paths = svgElement.querySelectorAll('path');
            const pathData = Array.from(paths).map((path, index) => ({
              key: index,
              d: path.getAttribute('d') || '',
              fill: path.getAttribute('fill') || 'black'
            }));
            
            // Cleanup
            root.unmount();
            document.body.removeChild(tempDiv);
            resolve(pathData);
          }
        });
        
        // Start observing the temporary div for changes
        observer.observe(tempDiv, {
          childList: true,
          subtree: true
        });
        
        root.render(
          <QRCodeSVG value={value} size={120} level="M" />
        );
      });
    } catch (error) {
      console.error('Error generating QR code paths:', error);
      return [];
    }
  };

  // Generate QR code paths on component mount
  useEffect(() => {
    generateQRCodePaths(qrData).then(setQrPaths);
  }, [qrData]);

  // Call onRenderComplete when qrPaths is set and component has re-rendered
  useEffect(() => {
    if (qrPaths.length > 0 && onRenderComplete) {
      onRenderComplete();
    }
  }, [qrPaths, onRenderComplete]);
  
  // Colors
  const primaryColor = '#3b82f6';
  const primaryDarkColor = '#1d4ed8';
  const cardBackground = '#f8fafc';
  const textColor = '#1f2937';
  const textSecondaryColor = '#6b7280';
  const borderColor = '#e5e7eb';

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${cardWidth} ${cardHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Card background - simplified design */}
      <defs>
        {/* Simple gradients that work well in both screen and PDF */}
        <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
        
        <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={primaryDarkColor} />
        </linearGradient>
        
        <linearGradient id="photoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={primaryDarkColor} />
        </linearGradient>
      </defs>

      {/* Card background */}
      <rect
        x="0"
        y="0"
        width={cardWidth}
        height={cardHeight}
        rx="12"
        ry="12"
        fill="url(#cardGradient)"
      />

      {/* Header */}
      <path
        d={`M 12 0 L ${cardWidth - 12} 0 Q ${cardWidth} 0 ${cardWidth} 12 L ${cardWidth} ${headerHeight} L 0 ${headerHeight} L 0 12 Q 0 0 12 0 Z`}
        fill="url(#headerGradient)"
      />
      
      {/* Header content */}
      {/* Logo */}
      <rect
        x="20"
        y="10"
        width="40"
        height="40"
        rx="8"
        ry="8"
        fill="rgba(255, 255, 255, 0.2)"
      />
      <text
        x="41"
        y="32"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="18"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        ID
      </text>
      
      {/* Title */}
      <text
        x="80"
        y="24"
        fill="white"
        fontSize="14"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        letterSpacing="0.5"
      >
        AUTHENTICATED IDENTITY CARD
      </text>
      <text
        x="80"
        y="46"
        fill="white"
        fontSize="12"
        fontFamily="Arial, sans-serif"
        opacity="0.9"
      >
        {communityName}
      </text>

      {/* Body */}
      <rect
        x="0"
        y={headerHeight}
        width={cardWidth}
        height={bodyHeight}
        fill="transparent"
      />
      
      {/* Member photo */}
      <g transform={`translate(20, ${headerHeight + 20})`}>
        {/* Photo border */}
        <rect
          x="0"
          y="0"
          width="80"
          height="80"
          rx="12"
          ry="12"
          fill="none"
          stroke={primaryColor}
          strokeWidth="3"
        />
        
        {memberPhoto ? (
          <defs>
            <clipPath id="photoClip">
              <rect x="3" y="3" width="74" height="74" rx="9" ry="9" />
            </clipPath>
          </defs>
        ) : (
          <rect
            x="3"
            y="3"
            width="74"
            height="74"
            rx="9"
            ry="9"
            fill="url(#photoGradient)"
          />
        )}
        
        {memberPhoto ? (
          <image
            href={memberPhoto}
            x="3"
            y="3"
            width="74"
            height="74"
            clipPath="url(#photoClip)"
          />
        ) : (
          <text
            x="40"
            y="40"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="32"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            {memberInitial}
          </text>
        )}
      </g>
      
      {/* Member details */}
      <text
        x="120"
        y={headerHeight + 35}
        fill={textColor}
        fontSize="20"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        {memberName}
      </text>
      
      {/* Member details */}
      <text
        x="120"
        y={headerHeight + 60}
        fill={textColor}
        fontSize="18"
        // fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        <tspan x="120" y={headerHeight + 60}>Authenticated</tspan>
        <tspan x="120" y={headerHeight + 80}>member</tspan>
      </text>
      
      {/* Main text - moved below photo for more width */}
      <text
        x="20"
        y={headerHeight + 120}
        fill={textSecondaryColor}
        fontSize="12"
        fontFamily="Arial, sans-serif"
      >
        <tspan x="20" y={headerHeight + 124}>This certifies that {memberName} is</tspan>
        <tspan x="20" y={headerHeight + 140}>an authenticated member of</tspan>
        <tspan x="20" y={headerHeight + 156}>{communityName}.</tspan>
      </text>
      
      {/* QR Code */}
      <g transform={`translate(${cardWidth - 160}, ${headerHeight + 18})`}>
        <rect
          x="0"
          y="0"
          width="140"
          height="140"
          rx="12"
          ry="12"
          fill="white"
          stroke={borderColor}
          strokeWidth="1"
        />
        {/* Render QR code as SVG paths */}
        <svg x="0" y="0" width="140" height="140" viewBox="0 0 140 140">
          <g transform="translate(10, 10) scale(2.44)">
            {qrPaths.map((path) => (
              <path
                key={path.key}
                d={path.d}
                fill={path.fill}
              />
            ))}
          </g>
        </svg>
      </g>

      {/* Footer */}
      <path
        d={`M 0 ${cardHeight - footerHeight} L ${cardWidth} ${cardHeight - footerHeight} L ${cardWidth} ${cardHeight - 12} Q ${cardWidth} ${cardHeight} ${cardWidth - 12} ${cardHeight} L 12 ${cardHeight} Q 0 ${cardHeight} 0 ${cardHeight - 12} Z`}
        fill={cardBackground}
        stroke={borderColor}
        strokeWidth="1"
        strokeDasharray="0 0 0 1"
      />
      
      {/* Member ID */}
      <text
        x={cardWidth / 2}
        y={cardHeight - 17}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textSecondaryColor}
        fontSize="10"
        fontWeight="normal"
        fontFamily="Courier New"
      >
        ID: {agentId}
      </text>
    </svg>
  );
};

export default IdentityCardSVG;
