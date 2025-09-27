import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MerchantScreen() {
  const { qr_code } = useLocalSearchParams();
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    if (qr_code) {
      fetchMerchantProfile();
    } else {
      setLoading(false);
      Alert.alert('Error', 'No merchant QR code provided');
    }
  }, [qr_code]);

  const checkLoginStatus = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      setIsLoggedIn(!!customerId);
    } catch (error) {
      setIsLoggedIn(false);
    }
  };

  const fetchMerchantProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=get_merchant_profile',
        { qr_code }
      );

      if (response.data && response.data.id) {
        setMerchant(response.data);
      } else {
        Alert.alert(
          'Merchant Not Found',
          'This merchant profile could not be found or is inactive.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error fetching merchant profile:', error);
      Alert.alert(
        'Error',
        'Unable to load merchant profile. Please try again.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please login to make a payment to this merchant.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/') }
        ]
      );
      return;
    }

    // Navigate to payment screen
    router.push({
      pathname: '/qr-payment',
      params: { 
        merchantData: JSON.stringify(merchant),
        qrCode: qr_code
      }
    });
  };

  const shareMerchant = async () => {
    try {
      await Share.share({
        message: `Check out ${merchant.business_name}!\nContact: ${merchant.mobile}\nEmail: ${merchant.email}`,
        title: `${merchant.business_name} - Merchant Profile`,
      });
    } catch (error) {
      console.error('Error sharing merchant:', error);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#5F259F', '#713EBE']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading merchant profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!merchant) {
    return (
      <LinearGradient colors={['#5F259F', '#713EBE']} style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#fff" style={styles.errorIcon} />
          <Text style={styles.errorText}>Merchant not found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const getInitials = (name) => {
    if (!name) return "M";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <LinearGradient colors={['#5F259F', '#713EBE']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Merchant Profile</Text>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={shareMerchant}
          >
            <Ionicons name="share-social-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main Merchant Card */}
        <View style={styles.merchantCard}>
          <View style={styles.merchantHeader}>
            <View style={styles.merchantIcon}>
              <Text style={styles.merchantIconText}>{getInitials(merchant.business_name)}</Text>
              <MaterialCommunityIcons name="store" size={22} color="#fff" style={styles.storeIcon} />
            </View>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: merchant.status === 'ACTIVE' ? '#4CAF50' : '#f44336' }
              ]}>
                <Ionicons 
                  name={merchant.status === 'ACTIVE' ? "checkmark-circle" : "close-circle"} 
                  size={12} 
                  color="#fff" 
                  style={styles.statusIcon} 
                />
                <Text style={styles.statusText}>{merchant.status}</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.businessName}>{merchant.business_name}</Text>
          <Text style={styles.contactPerson}>{merchant.contact_person}</Text>
          
          <View style={styles.merchantCardDivider} />
          
          <View style={styles.merchantMetrics}>
            <View style={styles.metricItem}>
              <MaterialIcons name="confirmation-number" size={16} color="#5F259F" />
              <Text style={styles.metricLabel}>ID: {merchant.id}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <MaterialIcons name="account-balance-wallet" size={16} color="#5F259F" />
              <Text style={styles.metricLabel}>₹{parseFloat(merchant.wallet).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="contact-phone" size={20} color="#5F259F" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <Feather name="smartphone" size={18} color="#5F259F" />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Mobile</Text>
              <Text style={styles.contactValue}>{merchant.mobile}</Text>
            </View>
          </View>

          <View style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <MaterialIcons name="email" size={18} color="#5F259F" />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{merchant.email}</Text>
            </View>
          </View>
        </View>

        {/* Location Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#5F259F" />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          
          <View style={styles.locationItem}>
            <View style={styles.contactIconContainer}>
              <FontAwesome5 name="map-marker-alt" size={18} color="#5F259F" />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationText}>
                {merchant.state}
                {merchant.district && `, ${merchant.district}`}
                {merchant.block && `, ${merchant.block}`}
                {merchant.pincode && ` - ${merchant.pincode}`}
              </Text>
            </View>
          </View>

          {merchant.latitude && merchant.longitude && (
            <View style={styles.coordinatesContainer}>
              <MaterialIcons name="my-location" size={14} color="#666" style={styles.coordinatesIcon} />
              <Text style={styles.coordinatesText}>
                Lat: {merchant.latitude}, Long: {merchant.longitude}
              </Text>
            </View>
          )}
        </View>

        {/* Business Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="store-settings" size={20} color="#5F259F" />
            <Text style={styles.sectionTitle}>Business Details</Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <MaterialIcons name="category" size={16} color="#5F259F" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Category ID</Text>
            </View>
            <Text style={styles.detailValue}>{merchant.category_id}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <MaterialIcons name="date-range" size={16} color="#5F259F" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Joined On</Text>
            </View>
            <Text style={styles.detailValue}>
              {new Date(merchant.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.payButton}
            onPress={handlePayNow}
            disabled={!isLoggedIn}
          >
            <View style={styles.payButtonContent}>
              <Text style={styles.payButtonText}>
                {isLoggedIn ? "Pay Now" : "Login to Pay"}
              </Text>
              <MaterialIcons name="arrow-forward" size={22} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/qr-scanner')}>
            <MaterialIcons name="qr-code-scanner" size={20} color="#fff" style={styles.scanIcon} />
            <Text style={styles.scanButtonText}>Scan Another QR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  merchantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 15,
  },
  merchantIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5F259F',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  merchantIconText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  storeIcon: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    backgroundColor: '#4F29B1',
    borderRadius: 10,
    padding: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  contactPerson: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  merchantCardDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
    width: '100%',
  },
  merchantMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#eee',
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(95, 37, 159, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDetails: {
    flex: 1,
  },
  locationText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  coordinatesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordinatesIcon: {
    marginRight: 6,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  payButton: {
    backgroundColor: '#5F259F',
    borderRadius: 25,
    paddingVertical: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  scanButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scanIcon: {
    marginRight: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});