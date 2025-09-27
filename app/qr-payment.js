import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function QRPaymentScreen() {
  const { merchantData, qrCode } = useLocalSearchParams();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [merchant, setMerchant] = useState(null);

  useEffect(() => {
    loadCustomerId();
    if (merchantData) {
      try {
        const parsedMerchant = JSON.parse(merchantData);
        setMerchant(parsedMerchant);
      } catch (error) {
        Alert.alert('Error', 'Invalid merchant data');
        router.back();
      }
    }
  }, [merchantData]);

  const loadCustomerId = async () => {
    try {
      const id = await AsyncStorage.getItem('customer_id');
      setCustomerId(id);
    } catch (error) {
      Alert.alert('Error', 'Unable to load customer information');
      router.back();
    }
  };

  const processPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!customerId) {
      Alert.alert('Error', 'Customer information not found');
      return;
    }

    if (!merchant) {
      Alert.alert('Error', 'Merchant information not found');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=add_qr_txn',
        {
          customer_id: parseInt(customerId),
          merchant_id: parseInt(merchant.id),
          txn_amount: parseFloat(amount)
        }
      );

      if (response.data.status === 'success') {
        Alert.alert(
          'Payment Successful!',
          `Transaction completed successfully to ${merchant.business_name}.\nTransaction ID: ${response.data.id}`,
          [
            {
              text: 'Done',
              onPress: () => router.replace('/dashboard')
            }
          ]
        );
      } else {
        Alert.alert('Error', response.data.msg || 'Transaction failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    return cleaned;
  };

  const getInitials = (name) => {
    if (!name) return "M";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (!merchant) {
    return (
      <LinearGradient colors={['#5F259F', '#713EBE']} style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading merchant information...</Text>
        </View>
      </LinearGradient>
    );
  }

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
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Pay to Merchant</Text>
                <View style={styles.spacer} />
              </View>

              <View style={styles.merchantCard}>
                <View style={styles.merchantIconContainer}>
                  <View style={styles.merchantIcon}>
                    <Text style={styles.merchantIconText}>{getInitials(merchant.business_name)}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name="store" 
                    size={22} 
                    color="#fff" 
                    style={styles.storeIcon} 
                  />
                </View>
                
                <Text style={styles.merchantTitle}>{merchant.business_name}</Text>
                <Text style={styles.contactPerson}>{merchant.contact_person}</Text>
                
                <View style={styles.merchantInfoRow}>
                  <Ionicons name="location-outline" size={16} color="#666" style={styles.infoIcon} />
                  <Text style={styles.merchantContact} numberOfLines={1}>
                    {merchant.block ? `${merchant.block}, ` : ''}
                    {merchant.district ? `${merchant.district}, ` : ''}
                    {merchant.state} {merchant.pincode ? `- ${merchant.pincode}` : ''}
                  </Text>
                </View>
                
                <View style={styles.merchantInfoRow}>
                  <MaterialIcons name="confirmation-number" size={16} color="#666" style={styles.infoIcon} />
                  <Text style={styles.merchantInfo}>Merchant ID: {merchant.id}</Text>
                </View>
                
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: merchant.status === 'ACTIVE' ? '#4CAF50' : '#f44336' }
                ]}>
                  <Ionicons 
                    name={merchant.status === 'ACTIVE' ? 'checkmark-circle' : 'close-circle'} 
                    size={12} 
                    color="#fff" 
                    style={styles.statusIcon} 
                  />
                  <Text style={styles.statusText}>{merchant.status}</Text>
                </View>
              </View>

              <View style={styles.paymentForm}>
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>
                    <Ionicons name="cash-outline" size={18} color="#fff" style={styles.amountIcon} />
                    Enter Amount
                  </Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor="#a0a0a0"
                      value={amount}
                      onChangeText={(text) => setAmount(formatAmount(text))}
                      keyboardType="numeric"
                      autoFocus
                    />
                  </View>
                </View>

                <View style={styles.quickAmounts}>
                  <Text style={styles.quickAmountsLabel}>
                    <MaterialIcons name="speed" size={18} color="#fff" style={styles.quickIcon} />
                    Quick Amounts
                  </Text>
                  <View style={styles.quickAmountsRow}>
                    {['100', '200', '500', '1000'].map((quickAmount) => (
                      <TouchableOpacity
                        key={quickAmount}
                        style={[
                          styles.quickAmountButton,
                          amount === quickAmount && styles.quickAmountButtonActive
                        ]}
                        onPress={() => setAmount(quickAmount)}
                      >
                        <Text style={[
                          styles.quickAmountText,
                          amount === quickAmount && styles.quickAmountTextActive
                        ]}>
                          ₹{quickAmount}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.securePaymentInfo}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#E0E0E0" />
                  <Text style={styles.securePaymentText}>100% secure payment</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.payButton,
                  (!amount || parseFloat(amount) <= 0) && styles.payButtonDisabled
                ]}
                onPress={processPayment}
                disabled={!amount || parseFloat(amount) <= 0 || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <View style={styles.payButtonContent}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.payButtonIcon} />
                      <Text style={styles.payButtonText}>
                        Pay ₹{amount || '0.00'}
                      </Text>
                    </View>
                    <Text style={styles.payButtonMerchant}>to {merchant.business_name}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.cancelButtonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => router.back()}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel Payment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
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
  spacer: {
    width: 40,
  },
  merchantCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  merchantIconContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  merchantIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5F259F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantIconText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
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
  merchantTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  contactPerson: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  merchantInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    width: '100%',
  },
  infoIcon: {
    marginRight: 6,
  },
  merchantContact: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  merchantInfo: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentForm: {
    marginBottom: 24,
  },
  amountContainer: {
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountIcon: {
    marginRight: 6,
  },
  amountInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5F259F',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  quickAmounts: {
    marginBottom: 20,
  },
  quickAmountsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickIcon: {
    marginRight: 6,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  quickAmountButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#5F259F',
  },
  quickAmountText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  quickAmountTextActive: {
    color: '#5F259F',
  },
  securePaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  securePaymentText: {
    color: '#E0E0E0',
    fontSize: 13,
    marginLeft: 6,
  },
  payButton: {
    backgroundColor: '#4F29B1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    backgroundColor: 'rgba(79, 41, 177, 0.6)',
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonIcon: {
    marginRight: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  payButtonMerchant: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  cancelButtonContainer: {
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});