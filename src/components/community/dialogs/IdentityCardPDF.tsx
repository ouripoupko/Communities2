import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Svg, Path } from '@react-pdf/renderer';



// Create styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#E3E7EA', // $gray-50
    width: '85.6mm',
    height: '54mm',
    padding: 0,
    margin: 0,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '8px 10px', // Increased vertical padding for better centering
    backgroundColor: '#3b82f6', // $primary
    color: 'white',
  },
  logo: {
    marginRight: '12px', // $spacing-md
    marginTop: 'auto',
    marginBottom: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 25,
    height: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 12, // $text-lg
    color: 'white',
    textAlign: 'center',
    lineHeight: 1, // Remove extra line spacing
    padding: '6px 6px', // Remove any default padding
    margin: 0, // Remove any default margin
  },
  title: {
    flex: 1,
  },
  titleMain: {
    fontSize: 9, // $text-sm
    fontWeight: 'bold',
    margin: '0 0 2px 0',
    letterSpacing: 0.5,
    color: 'white',
  },
  titleSub: {
    fontSize: 8, // $text-xs
    margin: 0,
    opacity: 0.9,
    color: 'white',
  },
  cardBody: {
    flex: 1,
    padding: '12px 10px', // $spacing-md $spacing-lg
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px', // $spacing-md
  },
  memberInfo: {
    flex: 5,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px', // $spacing-md
  },
  memberPhoto: {
    width: 60,
    height: 60,
    overflow: 'hidden',
    flexShrink: 0,
  },
  memberPhotoBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3b82f6', // $primary
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 20, // $text-2xl
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 10, // $text-lg
    fontWeight: 'bold',
    color: '#1f2937', // $gray-800
    marginBottom: '4px', // $spacing-xs
  },
  memberStatement: {
    fontSize: 8, // $text-xs
    color: '#6b7280', // $gray-600
    lineHeight: 1.4,
    margin: 0,
    hyphens: 'none',
    wordBreak: 'keep-all',
  },
  qrSection: {
    flex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCode: {
    borderRadius: 6,
    backgroundColor: 'white',
    padding: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3px 2px 4px 2px', // Reduced left/right padding for more space
    backgroundColor: '#f9fafb', // $gray-50
    borderTop: '1px solid #e5e7eb', // $gray-200
  },
  memberId: {
    fontSize: 5.5, // Slightly smaller font to fit across card width
    fontWeight: 'medium',
    color: '#374151', // $gray-700
    textAlign: 'center',
    wordBreak: 'break-all',
    lineHeight: 1.0, // Tight line height
  },
});

interface IdentityCardPDFProps {
  communityName: string;
  memberName: string;
  memberInitial: string;
  memberPhoto?: string;
  qrPaths: Array<{key: number, d: string, fill: string}>;
  agentId: string;
}

const IdentityCardPDF: React.FC<IdentityCardPDFProps> = ({
  communityName,
  memberName,
  memberInitial,
  memberPhoto,
  qrPaths,
  agentId,
}) => (
  <Document>
    <Page size={[242.5, 153.1]} style={styles.page}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>ID</Text>
          </View>
          <View style={styles.title}>
            <Text style={styles.titleMain}>AUTHENTICATED IDENTITY CARD</Text>
            <Text style={styles.titleSub}>{communityName} Community</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.memberInfo}>
            <View style={styles.memberPhoto}>
              {memberPhoto ? (
                <>
                  <Image src={memberPhoto} style={{ width: 60, height: 60, borderRadius: 12 }} />
                  <View style={styles.memberPhotoBorder} />
                </>
              ) : (
                <Text style={styles.photoPlaceholder}>{memberInitial}</Text>
              )}
            </View>
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>{memberName}</Text>
              <Text style={styles.memberStatement}>
                This certifies that <Text style={{ fontWeight: 'bold' }}>{memberName}</Text> is an authenticated member of the <Text style={{ fontWeight: 'bold' }}>{communityName}</Text> community.
              </Text>
            </View>
          </View>
          
          <View style={styles.qrSection}>
            <View style={styles.qrCode}>
              <Svg width={65} height={65} viewBox="0 0 50 50">
                {qrPaths.map((path) => (
                  <Path
                    key={path.key}
                    d={path.d}
                    fill={path.fill}
                  />
                ))}
              </Svg>
            </View>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.memberId}>ID: {agentId}</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default IdentityCardPDF;
