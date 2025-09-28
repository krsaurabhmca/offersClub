import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function OTPScreen() {
  const { mobile, loginType = 'customer', otpSent } = useLocalSearchParams();
  const [otp, setOTP] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOTPChange = (value, index) => {
    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;
    
    const newOTP = [...otp];
    newOTP[index] = value;
    setOTP(newOTP);

    // Auto-focus next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 4 digits are entered
    if (newOTP.every(digit => digit !== '') && newOTP.join('').length === 4) {
      setTimeout(() => verifyOTP(newOTP.join('')), 100);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async (otpCode = null) => {
    const finalOtpCode = otpCode || otp.join('');

    if (finalOtpCode.length !== 4) {
      Alert.alert('Error', 'Please enter complete OTP');
      return;
    }

    setLoading(true);
    try {
      // Use different endpoints based on login type
      const endpoint = loginType === 'merchant' 
        ? 'https://offersclub.offerplant.com/opex/api.php?task=merchant_login'
        : 'https://offersclub.offerplant.com/opex/api.php?task=login';

      console.log('Verifying OTP:', { mobile, otp: finalOtpCode, loginType, endpoint });

      const response = await axios.post(endpoint, { 
        mobile, 
        otp: finalOtpCode 
      });

      console.log('OTP Verification Response:', response.data);

      if (response.data.status === 'success') {
        // Store user data based on login type
        if (loginType === 'merchant') {
          if (response.data.merchant_id) {
            await AsyncStorage.setItem('merchant_id', response.data.merchant_id);
            await AsyncStorage.setItem('mobile', mobile);
            await AsyncStorage.setItem('loginType', 'merchant');
            
            // Navigate to merchant dashboard
            router.replace('/(merchant)/dashboard');
          } else {
            Alert.alert('Error', 'Invalid merchant response data');
          }
        } else {
          // Customer login
          if (response.data.customer_id) {
            await AsyncStorage.setItem('customer_id', response.data.customer_id);
            await AsyncStorage.setItem('mobile', mobile);
            await AsyncStorage.setItem('loginType', 'customer');

            // Navigate based on URL from response
            if (response.data.url === 'dashboard') {
              router.replace('/(customer)/dashboard');
            } else if (response.data.url === 'profile') {
              router.replace('/(customer)/profile');
            } else {
              // Default to dashboard for customer
              router.replace('/(customer)/dashboard');
            }
          } else {
            Alert.alert('Error', 'Invalid customer response data');
          }
        }
      } else {
        Alert.alert('Error', response.data.msg || 'Invalid OTP');
        setOTP(['', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
      setOTP(['', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setResendLoading(true);
    try {
      // Use different endpoints for resending OTP
      const endpoint = loginType === 'merchant'
        ? 'https://offersclub.offerplant.com/opex/api.php?task=merchant_send_otp'
        : 'https://offersclub.offerplant.com/opex/api.php?task=send_otp';

      const response = await axios.post(endpoint, { mobile });

      if (response.data.status === 'success') {
        Alert.alert('Success', 'OTP sent successfully');
        setTimer(30);
        setCanResend(false);
        setOTP(['', '', '', '']);
        otpRefs.current[0]?.focus();
        
        // Restart timer
        const interval = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              setCanResend(true);
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        Alert.alert('Error', response.data.msg || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP Error:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const formatMobile = (number) => {
    if (!number) return '';
    return `+91 ${number.substring(0, 5)} ${number.substring(5)}`;
  };

  const getTitle = () => {
    return loginType === 'merchant' ? 'Merchant Verification' : 'Customer Verification';
  };

  const getSubtitle = () => {
    const userType = loginType === 'merchant' ? 'merchant' : 'customer';
    return `Enter the ${userType} verification code sent to`;
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient
        colors={loginType === 'merchant' ? ['#5F259F', '#713EBE'] : ['#5F259F', '#713EBE']}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                {loginType === 'merchant' ? (
                  <MaterialIcons name="business" size={40} color="#5F259F" />
                ) : (
                  <MaterialIcons name="sms" size={40} color="#5F259F" />
                )}
              </View>
              {loginType === 'merchant' && (
                <View style={styles.merchantBadge}>
                  <Text style={styles.merchantBadgeText}>MERCHANT</Text>
                </View>
              )}
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>{getTitle()}</Text>
              <Text style={styles.subtitle}>
                {getSubtitle()}{'\n'}
                <Text style={styles.phoneNumber}>{formatMobile(mobile)}</Text>
              </Text>
              
              {/* Show test OTP if available */}
              {otpSent && (
                <View style={styles.testOtpContainer}>
                  <Text style={styles.testOtpLabel}>Test OTP:</Text>
                  <Text style={styles.testOtpValue}>{otpSent}</Text>
                </View>
              )}
            </View>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <View key={index} style={styles.otpInputWrapper}>
                  <TextInput
                    ref={(ref) => (otpRefs.current[index] = ref)}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOTPChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus={true}
                  />
                  {digit && <View style={styles.otpDot} />}
                </View>
              ))}
            </View>

            <View style={styles.timerContainer}>
              {canResend ? (
                <TouchableOpacity 
                  onPress={resendOTP} 
                  style={styles.resendButton}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <FontAwesome name="refresh" size={14} color="#fff" style={styles.resendIcon} />
                      <Text style={styles.resendText}>Resend OTP</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.timerWrapper}>
                  <Ionicons name="timer-outline" size={18} color="#f0f0f0" style={styles.timerIcon} />
                  <Text style={styles.timerText}>
                    Resend OTP in <Text style={styles.timerCount}>{timer}s</Text>
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (loading || otp.join('').length !== 4) && styles.verifyButtonDisabled
              ]}
              onPress={() => verifyOTP()}
              disabled={loading || otp.join('').length !== 4}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>
                    {loginType === 'merchant' ? 'Access Dashboard' : 'Verify & Proceed'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.verifyIcon} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpLink}>
              <MaterialIcons name="help-outline" size={16} color="#f0f0f0" style={styles.helpIcon} />
              <Text style={styles.helpText}>Need Help?</Text>
            </TouchableOpacity>

            {/* Login Type Indicator */}
            <View style={styles.loginTypeIndicator}>
              <Text style={styles.loginTypeText}>
                {loginType === 'merchant' ? '🏪 Merchant Login' : '👤 Customer Login'}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginTop: 60,
    marginBottom: 30,
    alignItems: 'center',
    position: 'relative',
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  merchantBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  merchantBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#f0f0f0',
    textAlign: 'center',
    lineHeight: 20,
  },
  phoneNumber: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  testOtpContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  testOtpLabel: {
    color: '#f0f0f0',
    fontSize: 12,
    marginRight: 8,
  },
  testOtpValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 30,
  },
  otpInputWrapper: {
    alignItems: 'center',
  },
  otpInput: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  otpInputFilled: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: '#fff',
  },
  otpDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerIcon: {
    marginRight: 6,
  },
  timerText: {
    color: '#f0f0f0',
    fontSize: 14,
  },
  timerCount: {
    fontWeight: 'bold',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    minWidth: 120,
    justifyContent: 'center',
  },
  resendIcon: {
    marginRight: 6,
  },
  resendText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#491E8E',
    borderRadius: 25,
    height: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
  },
  verifyButtonDisabled: {
    backgroundColor: 'rgba(73, 30, 142, 0.5)',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  verifyIcon: {
    marginTop: 1,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
  },
  helpIcon: {
    marginRight: 6,
  },
  helpText: {
    color: '#f0f0f0',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loginTypeIndicator: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});