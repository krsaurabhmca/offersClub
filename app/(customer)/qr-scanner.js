import axios from 'axios';
import { Camera, CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    getCameraPermissions();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const extractQRCode = (data) => {
    try {
      // Check if it's a URL
      if (data.includes('offersclub.offerplant.com') && data.includes('qr_code=')) {
        const url = new URL(data);
        return url.searchParams.get('qr_code');
      }
      
      // Check if it's JSON
      if (data.startsWith('{')) {
        const qrData = JSON.parse(data);
        return qrData.qr_code || qrData.merchant_id || qrData.merchantId || qrData.id;
      }
      
      // Check if it's a UUID pattern (qr_code format)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(data)) {
        return data;
      }
      
      // If it's just a number (merchant_id)
      const merchantId = parseInt(data);
      if (!isNaN(merchantId)) {
        return merchantId.toString();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const validateMerchant = async (qrCode) => {
    try {
      setValidating(true);
      
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=get_merchant_profile_by_qr',
        { qr_code: qrCode }
      );

      if (response.data && response.data.id) {
        return response.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Merchant validation error:', error);
      return null;
    } finally {
      setValidating(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || validating) return;
    
    setScanned(true);
    Vibration.vibrate(100);

    const qrCode = extractQRCode(data);
    
    if (!qrCode) {
      Alert.alert(
        'Invalid QR Code',
        'This QR code does not contain valid merchant information.',
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
      return;
    }

    // Validate merchant
    const merchantData = await validateMerchant(qrCode);
    
    if (!merchantData) {
      Alert.alert(
        'Invalid Merchant',
        'This merchant is not found or inactive. Please try another QR code.',
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
      return;
    }

    if (merchantData.status !== 'ACTIVE') {
      Alert.alert(
        'Merchant Inactive',
        'This merchant is currently inactive. Please try another QR code.',
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
      return;
    }

    // Navigate to payment screen with merchant data
    router.push({
      pathname: '/qr-payment',
      params: { 
        merchantData: JSON.stringify(merchantData),
        qrCode: qrCode
      }
    });
  };

  if (hasPermission === null) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (hasPermission === false) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>
            Camera permission is required to scan QR codes
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={getCameraPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        flash={flashOn ? 'on' : 'off'}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        {/* Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR Code</Text>
          <TouchableOpacity 
            style={styles.flashButton}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Text style={styles.flashButtonText}>
              {flashOn ? '🔦' : '💡'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Scanning Area */}
        <View style={styles.scanningArea}>
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {validating && (
                <View style={styles.validatingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.validatingText}>Validating merchant...</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.footer}
        >
          <Text style={styles.instructionText}>
            Position the QR code within the frame
          </Text>
          <Text style={styles.subInstructionText}>
            The camera will automatically scan and validate the merchant
          </Text>
          
          {scanned && !validating && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    flex: 1,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    flex: 2,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  flashButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  flashButtonText: {
    fontSize: 24,
  },
  scanningArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerOverlay: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
    borderWidth: 4,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  validatingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  validatingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  subInstructionText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  rescanButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});