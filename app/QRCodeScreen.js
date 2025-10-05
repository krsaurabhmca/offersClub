import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

const QRCodeScreen = ({ navigation }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  
  const qrContainerRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchMerchantData();
  }, []);

  useEffect(() => {
    if (!loading && qrData) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, qrData]);

  const fetchMerchantData = async () => {
    try {
      const storedMerchantId = await AsyncStorage.getItem('merchant_id');
      if (!storedMerchantId) {
        Alert.alert('Error', 'Merchant ID not found');
        navigation.goBack();
        return;
      }
      
      setMerchantId(storedMerchantId);
      
      const response = await fetch(
        `https://offersclub.offerplant.com/opex/public/qr_only?id=${storedMerchantId}`
      );
      const data = await response.json();
      
      if (data.status === 'success') {
        setQrData(data);
      } else {
        Alert.alert('Error', 'Failed to load QR code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch merchant data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!qrContainerRef.current || downloading) return;

    try {
      setDownloading(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant media library permission to download the QR code');
        setDownloading(false);
        return;
      }

      const uri = await captureRef(qrContainerRef.current, {
        format: 'png',
        quality: 1,
      });

      const asset = await MediaLibrary.createAssetAsync(uri);
      
      await MediaLibrary.createAlbumAsync('OffersClub', asset, false)
        .catch(() => {
          // Album might already exist
        });

      Alert.alert('Success', `QR code saved to gallery!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to download. Please try again.');
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!qrContainerRef.current) return;

    try {
      const uri = await captureRef(qrContainerRef.current, {
        format: 'png',
        quality: 1,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Share ${qrData?.business_name || 'QR Code'}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share QR code');
      console.error('Share error:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar barStyle="light-content" backgroundColor="#6c5ce7" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6c5ce7" />
            <Text style={styles.loadingText}>Loading QR Code...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#6c5ce7" />
        <View style={styles.header}   >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My QR Code</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} >
          <Animated.View 
            style={[
              styles.mainCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
            ref={qrContainerRef}
          >
            <View style={styles.businessNameContainer}>
              {/* <View style={styles.iconCircle}>
                <MaterialIcons name="store" size={32} color="#6c5ce7" />
              </View> */}
              <Text style={styles.businessName}>{qrData?.business_name || 'Business Name'}</Text>
              <View style={styles.divider} />
              <Text style={styles.subtitle}>Scan to Exciting Offers</Text>
            </View>

            <View 
             
              collapsable={false}
              style={styles.screenshotContainer}
            >
              <View style={styles.qrContainer}>
                <View style={styles.qrCodeWrapper}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                  
                  {qrData?.url ? (
                    <Image 
                      source={{ uri: qrData.url }} 
                      style={styles.qrCode}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <MaterialIcons name="qr-code-2" size={80} color="#dfe6e9" />
                      <Text style={styles.placeholderText}>QR Code not available</Text>
                    </View>
                  )}
                </View>
                
                {/* <View style={styles.merchantIdBadge}>
                  <MaterialIcons name="badge" size={16} color="#6c5ce7" />
                  <Text style={styles.merchantId}>ID: {merchantId}</Text>
                </View> */}
              </View>
            </View>

            <View style={styles.infoContainer}>
              <MaterialIcons name="info-outline" size={18} color="#74b9ff" />
              <Text style={styles.infoText}>
                Scan this QR code to avail exciting offers at {qrData?.business_name || 'your business'}!
              </Text>
            </View>
          </Animated.View>
            
          <Animated.View 
            style={[
              styles.actionButtons,
              { opacity: fadeAnim }
            ]}
          >
            <TouchableOpacity 
              style={[styles.actionButton, styles.downloadButton]} 
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.8}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <View style={styles.buttonIconContainer}>
                    <MaterialIcons name="download" size={26} color="#fff" />
                  </View>
                  <Text style={styles.actionButtonText}>Download</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.shareButton]} 
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainer}>
                <MaterialIcons name="share" size={26} color="#fff" />
              </View>
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6c5ce7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#636e72',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 24,
  },
  businessNameContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0ebff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2d3436',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#6c5ce7',
    borderRadius: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#636e72',
    fontWeight: '500',
  },
  screenshotContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCodeWrapper: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#6c5ce7',
    borderWidth: 3,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  qrCode: {
    width: 240,
    height: 240,
  },
  qrPlaceholder: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  placeholderText: {
    color: '#95a5a6',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  merchantIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ebff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  merchantId: {
    fontSize: 14,
    color: '#6c5ce7',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2980b9',
    fontWeight: '500',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },  
  downloadButton: {
    backgroundColor: '#6c5ce7',
  },    
  shareButton: {


    backgroundColor: '#00b894',
  },
  buttonIconContainer: {


    width: 36,


    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',

    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionButtonText: { 
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default QRCodeScreen;