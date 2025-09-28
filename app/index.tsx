import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState('customer'); // 'customer' or 'merchant'

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
    if (!mobile || mobile.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const endpoint = loginType === 'merchant' 
        ? 'https://offersclub.offerplant.com/opex/api.php?task=merchant_send_otp'
        : 'https://offersclub.offerplant.com/opex/api.php?task=send_otp';

      const response = await axios.post(endpoint, { mobile });

      if (response.data.status === 'success') {
        // Store mobile, OTP, and login type for verification
        await AsyncStorage.setItem('mobile', mobile);
        await AsyncStorage.setItem('otp', response.data.otp.toString());
        await AsyncStorage.setItem('loginType', loginType);
        
        router.push({
          pathname: '/otp',
          params: { 
            mobile, 
            otpSent: response.data.otp,
            loginType 
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

  const formatMobileNumber = (text) => {
    // Remove any non-digit characters
    const cleaned = text.replace(/\D/g, '');
    // Limit to 10 digits
    return cleaned.slice(0, 10);
  };

  const isValidMobile = mobile.length === 10;

  const toggleLoginType = (type) => {
    setLoginType(type);
    setMobile(''); // Clear mobile when switching
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="qrcode-scan" size={32} color="#fff" />
          </View>
          <Text style={styles.brandName}>OffersClub</Text>
          <Text style={styles.brandTagline}>Scan, Save & Smile</Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Welcome to OffersClub</Text>
              <Text style={styles.welcomeSubtitle}>
                India's most-loved Offers app
              </Text>
            </View>

            {/* Login Type Switcher */}
            <View style={styles.switcherContainer}>
              <View style={styles.switcherCard}>
                <TouchableOpacity
                  style={[
                    styles.switcherOption,
                    loginType === 'customer' && styles.switcherOptionActive
                  ]}
                  onPress={() => toggleLoginType('customer')}
                  activeOpacity={0.8}
                >
                  <View style={styles.switcherIconContainer}>
                    <Ionicons 
                      name="person" 
                      size={20} 
                      color={loginType === 'customer' ? '#fff' : '#5f259f'} 
                    />
                  </View>
                  <Text style={[
                    styles.switcherText,
                    loginType === 'customer' && styles.switcherTextActive
                  ]}>
                    Customer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.switcherOption,
                    loginType === 'merchant' && styles.switcherOptionActive
                  ]}
                  onPress={() => toggleLoginType('merchant')}
                  activeOpacity={0.8}
                >
                  <View style={styles.switcherIconContainer}>
                    <MaterialCommunityIcons 
                      name="store" 
                      size={20} 
                      color={loginType === 'merchant' ? '#fff' : '#5f259f'} 
                    />
                  </View>
                  <Text style={[
                    styles.switcherText,
                    loginType === 'merchant' && styles.switcherTextActive
                  ]}>
                    Merchant
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Card */}
            <View style={styles.loginCard}>
              <View style={styles.loginHeader}>
                <Text style={styles.loginTitle}>
                  {loginType === 'merchant' ? 'Merchant Login' : 'Login or Sign up'}
                </Text>
                <Text style={styles.loginSubtitle}>
                  {loginType === 'merchant' 
                    ? 'Access your merchant dashboard'
                    : 'to get started with your account'
                  }
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[
                  styles.inputContainer,
                  mobile.length > 0 && !isValidMobile && styles.inputContainerError
                ]}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={` ${loginType} mobile number`}
                    placeholderTextColor="#999"
                    value={mobile}
                    onChangeText={(text) => setMobile(formatMobileNumber(text))}
                    keyboardType="numeric"
                    maxLength={10}
                    autoFocus
                  />
                  {isValidMobile && (
                    <View style={styles.validIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#00C851" />
                    </View>
                  )}
                </View>
                
                {mobile.length > 0 && mobile.length < 10 && (
                  <Text style={styles.errorText}>
                    Please enter a valid 10-digit mobile number
                  </Text>
                )}
              </View>

              {/* Custom PhonePe-style Button */}
              <TouchableOpacity
                style={[
                  styles.proceedButton,
                  !isValidMobile && styles.proceedButtonDisabled
                ]}
                onPress={sendOTP}
                disabled={loading || !isValidMobile}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[
                    styles.proceedButtonText,
                    !isValidMobile && styles.proceedButtonTextDisabled
                  ]}>
                    PROCEED
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  By proceeding, you accept our{' '}
                  <Text style={styles.termsLink}>Terms & Conditions</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
            </View>

            {/* Features Section */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>
                {loginType === 'merchant' 
                  ? 'Why choose OffersClub for Business?' 
                  : 'Why choose OffersClub?'
                }
              </Text>
              <View style={styles.featuresList}>
                {loginType === 'merchant' ? (
                  <>
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <MaterialCommunityIcons name="cash-register" size={20} color="#00C851" />
                      </View>
                      <Text style={styles.featureText}>Easy Payment Management</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <MaterialCommunityIcons name="chart-line" size={20} color="#5f259f" />
                      </View>
                      <Text style={styles.featureText}>Business Analytics</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <MaterialCommunityIcons name="qrcode" size={20} color="#FF6B35" />
                      </View>
                      <Text style={styles.featureText}>QR Code Payments</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <Ionicons name="shield-checkmark" size={20} color="#00C851" />
                      </View>
                      <Text style={styles.featureText}>100% Secure & Safe</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <MaterialCommunityIcons name="lightning-bolt" size={20} color="#5f259f" />
                      </View>
                      <Text style={styles.featureText}>Instant Cashback </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <MaterialCommunityIcons name="gift" size={20} color="#FF6B35" />
                      </View>
                      <Text style={styles.featureText}>Exclusive Offers</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#5f259f',
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  // New styles for switcher
  switcherContainer: {
    marginBottom: 20,
  },
  switcherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  switcherOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  switcherOptionActive: {
    backgroundColor: '#5f259f',
    shadowColor: '#5f259f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  switcherIconContainer: {
    marginRight: 8,
  },
  switcherText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5f259f',
  },
  switcherTextActive: {
    color: '#fff',
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginHeader: {
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  inputContainerError: {
    borderColor: '#e74c3c',
  },
  countryCode: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#e1e5e9',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#fff',
  },
  validIcon: {
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 8,
    marginLeft: 4,
  },
  proceedButton: {
    backgroundColor: '#5f259f',
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#5f259f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  proceedButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  proceedButtonTextDisabled: {
    color: '#ecf0f1',
  },
  termsSection: {
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#5f259f',
    fontWeight: '500',
  },
  featuresSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  bottomPadding: {
    height: 20,
  },
});