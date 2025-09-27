import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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
  const { mobile } = useLocalSearchParams();
  const [otp, setOTP] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
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
    const newOTP = [...otp];
    newOTP[index] = value;
    setOTP(newOTP);

    // Auto-focus next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 4) {
      Alert.alert('Error', 'Please enter complete OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=login',
        { mobile, otp: otpCode }
      );

      if (response.data.status === 'success') {
        // Store customer ID
        await AsyncStorage.setItem('customer_id', response.data.customer_id);
        await AsyncStorage.setItem('mobile', mobile);

        // Navigate based on URL from response
        if (response.data.url === 'dashboard') {
          router.replace('/dashboard');
        } else if (response.data.url === 'profile') {
          router.replace('/profile');
        }
      } else {
        Alert.alert('Error', response.data.msg || 'Invalid OTP');
        setOTP(['', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    try {
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=send_otp',
        { mobile }
      );

      if (response.data.status === 'success') {
        Alert.alert('Success', 'OTP sent successfully');
        setTimer(30);
        setCanResend(false);
        setOTP(['', '', '', '']);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  const formatMobile = (number) => {
    if (!number) return '';
    return `+91 ${number.substring(0, 5)} ${number.substring(5)}`;
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient
        colors={['#5F259F', '#713EBE']}
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
                <MaterialIcons name="sms" size={40} color="#5F259F" />
              </View>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Verification Code</Text>
              <Text style={styles.subtitle}>
                We have sent the code to{'\n'}
                <Text style={styles.phoneNumber}>{formatMobile(mobile)}</Text>
              </Text>
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
                  />
                  {digit && <View style={styles.otpDot} />}
                </View>
              ))}
            </View>

            <View style={styles.timerContainer}>
              {canResend ? (
                <TouchableOpacity onPress={resendOTP} style={styles.resendButton}>
                  <FontAwesome name="refresh" size={14} color="#fff" style={styles.resendIcon} />
                  <Text style={styles.resendText}>Resend OTP</Text>
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
              style={styles.verifyButton}
              onPress={verifyOTP}
              disabled={loading || otp.join('').length !== 4}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.verifyIcon} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpLink}>
              <MaterialIcons name="help-outline" size={16} color="#f0f0f0" style={styles.helpIcon} />
              <Text style={styles.helpText}>Need Help?</Text>
            </TouchableOpacity>
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
});