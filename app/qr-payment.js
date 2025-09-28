import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function QRCashbackClaimScreen() {
  const { merchantData, qrCode } = useLocalSearchParams();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [merchant, setMerchant] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionData, setTransactionData] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

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

  useEffect(() => {
    if (showSuccessModal) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSuccessModal]);

  const loadCustomerId = async () => {
    try {
      const id = await AsyncStorage.getItem('customer_id');
      setCustomerId(id);
    } catch (error) {
      Alert.alert('Error', 'Unable to load customer information');
      router.back();
    }
  };

  const processCashbackClaim = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid transaction amount');
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
        const currentDate = new Date();
        setTransactionData({
          id: response.data.id,
          amount: parseFloat(amount),
          merchant: merchant.business_name,
          date: currentDate.toLocaleDateString(),
          time: currentDate.toLocaleTimeString(),
          cashbackPercent: 5, // You can get this from API response
          cashbackAmount: (parseFloat(amount) * 0.05).toFixed(2) // Calculate based on percentage
        });
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', response.data.msg || 'Cashback claim failed');
      }
    } catch (error) {
      console.error('Cashback claim error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.replace('/dashboard');
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

  const SuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent={true}
      animationType="none"
      onRequestClose={handleSuccessClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.successHeader}
          >
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Cashback Claimed!</Text>
            <Text style={styles.successSubtitle}>Your request has been processed successfully</Text>
          </LinearGradient>

          <View style={styles.successBody}>
            <View style={styles.cashbackAmountContainer}>
              <Text style={styles.cashbackLabel}>Cashback Earned</Text>
              <Text style={styles.cashbackAmount}>₹{transactionData?.cashbackAmount}</Text>
              <Text style={styles.cashbackPercent}>{transactionData?.cashbackPercent}% of transaction amount</Text>
            </View>

            <View style={styles.transactionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Amount</Text>
                <Text style={styles.detailValue}>₹{transactionData?.amount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Merchant</Text>
                <Text style={styles.detailValue}>{transactionData?.merchant}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Claim ID</Text>
                <Text style={styles.detailValue}>#{transactionData?.id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {transactionData?.date} at {transactionData?.time}
                </Text>
              </View>
            </View>

            <View style={styles.successInfo}>
              <Ionicons name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.successInfoText}>
                Cashback will be credited to your wallet within 24-48 hours
              </Text>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.primaryAction}
              onPress={handleSuccessClose}
            >
              <Ionicons name="home" size={20} color="#fff" style={styles.actionIcon} />
              <Text style={styles.primaryActionText}>Go to Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={() => {
                // You can add share functionality here
                handleSuccessClose();
              }}
            >
              <Ionicons name="share-outline" size={18} color="#5F259F" />
              <Text style={styles.secondaryActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

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
                <Text style={styles.title}>Claim Cashback</Text>
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

              <View style={styles.claimForm}>
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>
                    <Ionicons name="receipt-outline" size={18} color="#fff" style={styles.amountIcon} />
                    Enter Transaction Amount
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

                <View style={styles.secureCashbackInfo}>
                  <Ionicons name="gift-outline" size={16} color="#E0E0E0" />
                  <Text style={styles.secureCashbackText}>100% secure cashback claim</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.claimButton,
                  (!amount || parseFloat(amount) <= 0) && styles.claimButtonDisabled
                ]}
                onPress={processCashbackClaim}
                disabled={!amount || parseFloat(amount) <= 0 || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <View style={styles.claimButtonContent}>
                      <Ionicons name="gift" size={20} color="#fff" style={styles.claimButtonIcon} />
                      <Text style={styles.claimButtonText}>
                        Claim Cashback for ₹{amount || '0.00'}
                      </Text>
                    </View>
                    <Text style={styles.claimButtonMerchant}>from {merchant.business_name}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.cancelButtonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => router.back()}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel Claim</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <SuccessModal />
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
  claimForm: {
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
  secureCashbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  secureCashbackText: {
    color: '#E0E0E0',
    fontSize: 13,
    marginLeft: 6,
  },
  claimButton: {
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
  claimButtonDisabled: {
    backgroundColor: 'rgba(79, 41, 177, 0.6)',
  },
  claimButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonIcon: {
    marginRight: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  claimButtonMerchant: {
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
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  successBody: {
    padding: 20,
  },
  cashbackAmountContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  cashbackLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cashbackAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  cashbackPercent: {
    fontSize: 14,
    color: '#888',
  },
  transactionDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  successInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  successInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  modalActions: {
    padding: 20,
    paddingTop: 0,
  },
  primaryAction: {
    backgroundColor: '#5F259F',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    marginRight: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: '#5F259F',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});