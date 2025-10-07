// app/(tabs)/share-and-earn.jsx or app/share-and-earn.jsx

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';


const API_URL = 'https://offersclub.offerplant.com/opex/api.php?task=share_and_earn';

const ShareAndEarnScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userType, setUserType] = useState(null); // 'customer' or 'merchant'

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for customer_id first
      let userId = await AsyncStorage.getItem('customer_id');
      let type = 'customer';

      // If customer_id not found, check for merchant_id
      if (!userId) {
        userId = await AsyncStorage.getItem('merchant_id');
        type = 'merchant';
      }

      // If neither found, show error
      if (!userId) {
        setError('User not authenticated. Please login again.');
        setLoading(false);
        return;
      }

      setUserType(type);

      // Make API call
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [`${type}_id`]: userId,
        }),
      });

      const data = await response.json();

      if (response.ok && data) {
        setUserData(data);
      } else {
        setError(data.message || 'Failed to fetch referral data');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!userData?.ref_code) return;
    
    Clipboard.setString(userData.ref_code);
    setCopied(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!userData?.msg) return;

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await Share.share({
        message: userData.msg,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#5f259f" />
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }} >
        <LinearGradient
          colors={['#5f259f', '#7c3aed', '#8b5cf6']}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share & Earn</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5f259f" />
          <Text style={styles.loadingText}>Loading your referral data...</Text>
        </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error State
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
       
        <StatusBar barStyle="light-content" backgroundColor="#5f259f" />
        <LinearGradient
          colors={['#5f259f', '#7c3aed', '#8b5cf6']}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share & Earn</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main UI
  return (
    <SafeAreaProvider >
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
     <View style={{ flex: 1, backgroundColor: '#f9fafb' }} >
      <StatusBar barStyle="light-content" backgroundColor="#5f259f" />
      
      {/* Header */}
      <LinearGradient
        colors={['#5f259f', '#7c3aed', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share & Earn</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchUserData}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Card - Earnings */}
        <LinearGradient
          colors={['#5f259f', '#7c3aed']}
          style={styles.earningsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.earningsContent}>
            <MaterialCommunityIcons name="wallet-giftcard" size={50} color="#fbbf24" />
            <View style={styles.earningsTextContainer}>
              <Text style={styles.earningsLabel}>Share and Earn Upto </Text>
              <Text style={styles.earningsAmount}>₹{userData?.ref_income || '0'}</Text>
              {/* <View style={styles.userTypeBadge}>
                <Text style={styles.userTypeText}>
                  {userType === 'customer' ? '👤 Customer' : '🏪 Merchant'}
                </Text>
              </View> */}
            </View>
          </View>
          <View style={styles.coinsDecoration}>
            <MaterialCommunityIcons name="coin" size={30} color="#fbbf24" style={styles.coin1} />
            <MaterialCommunityIcons name="coin" size={20} color="#fbbf24" style={styles.coin2} />
          </View>
        </LinearGradient>

        {/* Referral Code Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="ticket-percent" size={24} color="#5f259f" />
            <Text style={styles.cardTitle}>Your Referral Code</Text>
          </View>
          
          <View style={styles.codeContainer}>
            <View style={styles.codebox}>
              <Text style={styles.codeText}>{userData?.ref_code || 'N/A'}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.copyButton, copied && styles.copiedButton]}
              onPress={copyToClipboard}
            >
              <Ionicons 
                name={copied ? "checkmark-circle" : "copy-outline"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.copyButtonText}>
                {copied ? "Copied!" : "Copy"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How it Works */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb" size={24} color="#f59e0b" />
            <Text style={styles.cardTitle}>How it Works</Text>
          </View>
          
          <View style={styles.stepsContainer}>
            <StepItem 
              number="1"
              icon="share-social"
              title="Share your code"
              description="Share your referral code with friends"
            />
            <StepItem 
              number="2"
              icon="person-add"
              title="Friend joins"
              description="They sign up using your code"
            />
            <StepItem 
              number="3"
              icon="gift"
              title="Both get rewards"
              description="You both receive welcome bonus"
            />
          </View>
        </View>

        {/* Benefits Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="star-circle" size={24} color="#10b981" />
            <Text style={styles.cardTitle}>Referral Benefits</Text>
          </View>
          
          <View style={styles.benefitsContainer}>
            <BenefitItem 
              icon="gift-outline"
              text="Welcome bonus for your friend"
              color="#ec4899"
            />
            <BenefitItem 
              icon="cash-outline"
              text="Referral bonus for you"
              color="#10b981"
            />
            <BenefitItem 
              icon="trending-up-outline"
              text="Unlimited referrals allowed"
              color="#f59e0b"
            />
            <BenefitItem 
              icon="flash-outline"
              text="Instant cashback claims"
              color="#8b5cf6"
            />
          </View>
        </View>

        {/* User Info */}
        <View style={styles.userInfoCard}>
          <Ionicons name="person-circle" size={40} color="#5f259f" />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData?.name || 'User'}</Text>
            <Text style={styles.userSubtext}>Referral Partner</Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Bottom Share Button */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={styles.shareButtonWrapper}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#5f259f', '#7c3aed']}
            style={styles.shareButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text style={styles.shareButtonText}>Share with Friends</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
};

const StepItem = ({ number, icon, title, description }) => (
  <View style={styles.stepItem}>
    <View style={styles.stepNumberContainer}>
      <LinearGradient
        colors={['#5f259f', '#8b5cf6']}
        style={styles.stepNumber}
      >
        <Text style={styles.stepNumberText}>{number}</Text>
      </LinearGradient>
      <Ionicons name={icon} size={24} color="#5f259f" style={styles.stepIcon} />
    </View>
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  </View>
);

const BenefitItem = ({ icon, text, color }) => (
  <View style={styles.benefitItem}>
    <View style={[styles.benefitIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5f259f',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#5f259f',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  earningsCard: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#5f259f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  earningsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  earningsTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#e9d5ff',
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  userTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  userTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  coinsDecoration: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  coin1: {
    opacity: 0.3,
    transform: [{ rotate: '20deg' }],
  },
  coin2: {
    opacity: 0.2,
    position: 'absolute',
    right: -10,
    top: 30,
    transform: [{ rotate: '-20deg' }],
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 10,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codebox: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5f259f',
    textAlign: 'center',
    letterSpacing: 3,
  },
  copyButton: {
    backgroundColor: '#5f259f',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    elevation: 2,
  },
  copiedButton: {
    backgroundColor: '#10b981',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  stepsContainer: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumberContainer: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  stepIcon: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  stepContent: {
    flex: 1,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  benefitsContainer: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
  },
  benefitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  userInfoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  userSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  bottomSpacing: {
    height: 100,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom:0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  shareButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ShareAndEarnScreen;