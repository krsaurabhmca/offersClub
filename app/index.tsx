import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import './firebase';

export default function LoginScreen() {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState('customer');
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      const merchantId = await AsyncStorage.getItem('merchant_id');
      
      if (customerId) {
        router.replace('/(customer)/dashboard');
      } else if (merchantId) {
        router.replace('/(merchant)/dashboard');
      }
    } catch (error) {
      console.log('No existing session');
    }
  };

  const sendOTP = async () => {
    if (mobile.length !== 10) {
      Alert.alert('Error', 'Enter valid mobile number');
      return;
    }

    if (referralCode && !isValidReferral) {
      Alert.alert('Error', 'Invalid referral code');
      return;
    }

    setLoading(true);
    try {
      const endpoint = loginType === 'merchant' 
        ? 'https://offersclub.offerplant.com/opex/api.php?task=merchant_send_otp'
        : 'https://offersclub.offerplant.com/opex/api.php?task=send_otp';

      const response = await axios.post(endpoint, { 
        mobile,
        ...(referralCode && { ref_by: referralCode })
      });

      if (response.data.status === 'success') {
        await AsyncStorage.setItem('mobile', mobile);
        await AsyncStorage.setItem('otp', response.data.otp.toString());
        await AsyncStorage.setItem('loginType', loginType);
        
        router.push({
          pathname: '/otp',
          params: { 
            mobile, 
            otpSent: response.data.otp,
            loginType,
            ...(referralCode && { referralCode })
          }
        });
      } else {
        Alert.alert('Error', response.data.msg || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (text) => text.replace(/\D/g, '').slice(0, 10);
  const formatReferral = (text) => text.replace(/\D/g, '').slice(0, 6);

  const isValidMobile = mobile.length === 10;
  const isValidReferral = referralCode.length === 6 && 
    (referralCode[0] === '2' || referralCode[0] === '3');

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
      
      {/* Gradient Background Header */}
      <LinearGradient
        colors={['#5f259f', '#7c3aed', '#5f259f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <Image
                  source={require('./assets/logo.png')} // Add your logo
                  style={styles.logo}
                  resizeMode="contain"
                />
                {/* Fallback Icon */}
                {/* <MaterialCommunityIcons name="qrcode-scan" size={32} color="#5f259f" /> */}
              </View>
            </View>
          </View>
          <Text style={styles.brandName}>OffersClub</Text>
          <Text style={styles.tagline}>Scan • Save • Smile</Text>
        </View>
        
        {/* Wave decoration */}
        <View style={styles.wave} />
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Login Type Switcher */}
            <View style={styles.switcherWrapper}>
              <View style={styles.switcherContainer}>
                <TouchableOpacity
                  style={[styles.switcherTab, loginType === 'customer' && styles.switcherTabActive]}
                  onPress={() => {
                    setLoginType('customer');
                    setMobile('');
                    setReferralCode('');
                    setShowReferral(false);
                  }}
                  activeOpacity={0.7}
                >
                  {loginType === 'customer' && (
                    <LinearGradient
                      colors={['#5f259f', '#7c3aed']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <View style={styles.tabContent}>
                    <Ionicons 
                      name="person" 
                      size={20} 
                      color={loginType === 'customer' ? '#fff' : '#999'} 
                    />
                    <Text style={[styles.tabText, loginType === 'customer' && styles.tabTextActive]}>
                      Customer
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.switcherTab, loginType === 'merchant' && styles.switcherTabActive]}
                  onPress={() => {
                    setLoginType('merchant');
                    setMobile('');
                    setReferralCode('');
                    setShowReferral(false);
                  }}
                  activeOpacity={0.7}
                >
                  {loginType === 'merchant' && (
                    <LinearGradient
                      colors={['#5f259f', '#7c3aed']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <View style={styles.tabContent}>
                    <MaterialCommunityIcons 
                      name="store" 
                      size={20} 
                      color={loginType === 'merchant' ? '#fff' : '#999'} 
                    />
                    <Text style={[styles.tabText, loginType === 'merchant' && styles.tabTextActive]}>
                      Merchant
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Login Card */}
            <View style={styles.mainCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.welcomeText}>Welcome Back! 👋</Text>
                <Text style={styles.subtitle}>
                  {loginType === 'merchant' ? 'Manage your business' : 'Discover amazing offers'}
                </Text>
              </View>

              {/* Mobile Number Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[
                  styles.inputBox,
                  mobile.length > 0 && !isValidMobile && styles.inputBoxError,
                  isValidMobile && styles.inputBoxSuccess
                ]}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.flag}>🇮🇳</Text>
                    <Text style={styles.countryCode}>+91</Text>
                  </View>
                  <View style={styles.divider} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#999"
                    value={mobile}
                    onChangeText={(text) => setMobile(formatNumber(text))}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  {isValidMobile && (
                    <View style={styles.checkIconBox}>
                      <Ionicons name="checkmark-circle" size={24} color="#00C853" />
                    </View>
                  )}
                </View>
              </View>

              {/* Referral Code Section */}
              {loginType === 'customer' && (
              <TouchableOpacity 
                style={styles.referralButton}
                onPress={() => setShowReferral(!showReferral)}
                activeOpacity={0.7}
              >
                <View style={styles.referralButtonContent}>
                  <View style={styles.referralIconBox}>
                    <MaterialCommunityIcons name="gift" size={20} color="#5f259f" />
                  </View>
                  <Text style={styles.referralButtonText}>
                    {showReferral ? 'Hide Referral Code' : 'Have a Referral Code? '}
                  </Text>
                </View>
                <View style={styles.referralBadge}>
                  <Text style={styles.referralBadgeText}>New Users</Text>
                </View>
              </TouchableOpacity>
              )}

              {/* Referral Code Input */}
              {showReferral && (
                <View style={[styles.inputContainer, styles.referralInputContainer]}>
                  <Text style={styles.inputLabel}>Referral Code</Text>
                  <View style={[
                    styles.inputBox,
                    referralCode.length > 0 && !isValidReferral && styles.inputBoxError,
                    isValidReferral && styles.inputBoxSuccess
                  ]}>
                    <View style={styles.referralIconInInput}>
                      <MaterialCommunityIcons name="ticket-percent" size={22} color="#5f259f" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="2XXXXX or 3XXXXX"
                      placeholderTextColor="#999"
                      value={referralCode}
                      onChangeText={(text) => setReferralCode(formatReferral(text))}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                    {isValidReferral && (
                      <View style={styles.checkIconBox}>
                        <Ionicons name="checkmark-circle" size={24} color="#00C853" />
                      </View>
                    )}
                  </View>
                  
                  {isValidReferral && (
                    <View style={styles.successBanner}>
                      <LinearGradient
                        colors={['#00C853', '#00E676']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.successBannerGradient}
                      >
                        <Ionicons name="gift" size={18} color="#fff" />
                        <Text style={styles.successBannerText}>
                          🎉 Bonus rewards unlocked!
                        </Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>
              )}

              {/* Continue Button */}
              <TouchableOpacity
                style={[styles.continueButton, !isValidMobile && styles.continueButtonDisabled]}
                onPress={sendOTP}
                disabled={loading || !isValidMobile}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isValidMobile ? ['#5f259f', '#7c3aed'] : ['#D1D1D6', '#D1D1D6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.continueButtonText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Terms */}
              <Text style={styles.termsText}>
                By continuing, you agree to our{'\n'}
                <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Features Grid */}
            <View style={styles.featuresGrid}>
              {loginType === 'customer' ? (
                <>
                  <View style={styles.featureCard}>
                    <LinearGradient
                      colors={['#E8F5E9', '#C8E6C9']}
                      style={styles.featureGradient}
                    >
                      <View style={styles.featureIconWrapper}>
                        <Ionicons name="shield-checkmark" size={28} color="#00C853" />
                      </View>
                      <Text style={styles.featureTitle}>Secure</Text>
                      <Text style={styles.featureDesc}>100% Safe</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.featureCard}>
                    <LinearGradient
                      colors={['#F3E5F5', '#E1BEE7']}
                      style={styles.featureGradient}
                    >
                      <View style={styles.featureIconWrapper}>
                        <MaterialCommunityIcons name="lightning-bolt" size={28} color="#7c3aed" />
                      </View>
                      <Text style={styles.featureTitle}>Instant</Text>
                      <Text style={styles.featureDesc}>Cashback</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.featureCard}>
                    <LinearGradient
                      colors={['#FFF3E0', '#FFE0B2']}
                      style={styles.featureGradient}
                    >
                      <View style={styles.featureIconWrapper}>
                        <MaterialCommunityIcons name="gift" size={28} color="#FF9800" />
                      </View>
                      <Text style={styles.featureTitle}>Exclusive</Text>
                      <Text style={styles.featureDesc}>Offers</Text>
                    </LinearGradient>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.featureCard}>
                    <LinearGradient
                      colors={['#E8F5E9', '#C8E6C9']}
                      style={styles.featureGradient}
                    >
                      <View style={styles.featureIconWrapper}>
                        <MaterialCommunityIcons name="qrcode-scan" size={28} color="#00C853" />
                      </View>
                      <Text style={styles.featureTitle}>QR Code</Text>
                      <Text style={styles.featureDesc}>Payments</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.featureCard}>
                    <LinearGradient
                      colors={['#F3E5F5', '#E1BEE7']}
                      style={styles.featureGradient}
                    >
                      <View style={styles.featureIconWrapper}>
                        <MaterialCommunityIcons name="chart-line" size={28} color="#7c3aed" />
                      </View>
                      <Text style={styles.featureTitle}>Analytics</Text>
                      <Text style={styles.featureDesc}>Dashboard</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.featureCard}>
                    <LinearGradient
                      colors={['#FFF3E0', '#FFE0B2']}
                      style={styles.featureGradient}
                    >
                      <View style={styles.featureIconWrapper}>
                        <MaterialCommunityIcons name="cash-multiple" size={28} color="#FF9800" />
                      </View>
                      <Text style={styles.featureTitle}>Quick</Text>
                      <Text style={styles.featureDesc}>Settlement</Text>
                    </LinearGradient>
                  </View>
                </>
              )}
            </View>

            <View style={styles.bottomSpace} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  flex: {
    flex: 1,
  },
  
  // Gradient Header
  gradientHeader: {
    paddingTop: 50,
    paddingBottom: 60,
    position: 'relative',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 70,
    height: 70,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 1,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    letterSpacing: 2,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Switcher
  switcherWrapper: {
    marginBottom: 24,
  },
  switcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  switcherTab: {
    flex: 1,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeTabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  tabTextActive: {
    color: '#fff',
  },

  // Main Card
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#5f259f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    marginBottom: 28,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },

  // Input
  inputContainer: {
    marginBottom: 20,
  },
  referralInputContainer: {
    marginTop: -4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F8F9FB',
    overflow: 'hidden',
  },
  inputBoxError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  inputBoxSuccess: {
    borderColor: '#00C853',
    backgroundColor: '#F1FFF5',
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 12,
    gap: 6,
  },
  flag: {
    fontSize: 22,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  divider: {
    width: 2,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingVertical: 16,
  },
  checkIconBox: {
    paddingRight: 16,
  },
  referralIconInInput: {
    paddingLeft: 16,
    paddingRight: 8,
  },

  // Referral Button
  referralButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    borderRadius: 14,
    padding: 10,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E1BEE7',
  },
  referralButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5f259f',
  },
  referralBadge: {
    backgroundColor: '#5f259f',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  referralBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },

  // Success Banner
  successBanner: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  successBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  successBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Continue Button
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#5f259f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },

  // Terms
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#5f259f',
    fontWeight: '700',
  },

  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  featureCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  featureGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  featureIconWrapper: {
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },

  bottomSpace: {
    height: 30,
  },
});