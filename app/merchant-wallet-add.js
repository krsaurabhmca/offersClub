import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PaymentScreen() {
  const [amount, setAmount] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentDate, setPaymentDate] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Fetch merchant_id from AsyncStorage
    AsyncStorage.getItem('merchant_id')
      .then(id => {
        if (id) setMerchantId(id);
        else setMerchantId('GUEST'); // Default value if not found
      })
      .catch(err => console.log(err));
  }, []);

  // Calculate fee and total
  const calculateAmounts = () => {
    const baseAmount = parseFloat(amount) || 0;
    const fee = Math.max(Math.ceil(baseAmount * 0.1), 1); // 10% or minimum 1 rupee
    const total = baseAmount + fee;
    
    return {
      baseAmount: baseAmount.toFixed(2),
      fee: fee.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const { baseAmount, fee, total } = calculateAmounts();

  const handlePayment = async () => {
    let merchant_mobile  = await AsyncStorage.getItem('mobile');
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Validate amount is numeric and reasonable
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount > 100000) {
      Alert.alert('Error', 'Please enter a valid amount (max ₹100,000)');
      return;
    }

    setLoading(true);
    
    try {
      // Calculate total amount including fee
      const totalAmount = parseFloat(total);
      
      // 1️⃣ Call backend to create Razorpay order
      const orderRes = await axios.post('https://offerplant.com/offersclub/pay/create_order.php', {
        amount: Math.round(totalAmount * 100), // convert to paise (including fee)
        merchant_id: merchantId || 'GUEST'
      });

      if (orderRes.data.status !== 'success' || !orderRes.data.order_id) {
        throw new Error(orderRes.data.message || 'Failed to create order');
      }

      const order_id = orderRes.data.order_id;

      // 2️⃣ Launch Razorpay Checkout
      let options = {
        description: 'Payment to Merchant (includes 10% transaction fee)',
        image: 'https://offerplant.com/offersclub/logo.png',
        currency: 'INR',
        key: 'rzp_live_RUcX3vW4ZEbY47',
        amount: Math.round(totalAmount * 100), // paise (including fee)
        order_id: order_id,
        name: 'OffersClub',
        prefill: {
          email: 'offers@offersclub.in',
          contact: merchant_mobile,
          name: 'Merchant Name'
        },
        theme: { color: '#5f259f' }
      };

      RazorpayCheckout.open(options)
        .then(async (paymentData) => {
          try {
            // 3️⃣ Send payment details to your API to verify and record
            const verifyRes = await axios.post('https://offerplant.com/offersclub/pay/payment_verify.php', {
              ...paymentData,
              base_amount: baseAmount,
              fee_amount: fee,
              total_amount: total,
              merchant_id: merchantId || 'GUEST'
            });
            
            if (verifyRes.data.status === 'success') {
              const responseData = verifyRes.data.data || {};
              setPaymentSuccess(true);
              setPaymentDetails(responseData);
              setTransactionId(paymentData.razorpay_payment_id);
              setPaymentDate(responseData.payment_date || new Date().toLocaleString());
              
              // Store transaction in AsyncStorage for history
              try {
                const transactions = await AsyncStorage.getItem('payment_history') || '[]';
                const transactionHistory = JSON.parse(transactions);
                transactionHistory.unshift({
                  id: paymentData.razorpay_payment_id,
                  amount: total,
                  date: new Date().toISOString(),
                  merchant: merchantId || 'GUEST'
                });
                await AsyncStorage.setItem('payment_history', JSON.stringify(
                  transactionHistory.slice(0, 20) // Keep only the last 20
                ));
              } catch (e) {
                // Silently handle storage errors
                console.log('Error storing transaction history', e);
              }
            } else {
              throw new Error(verifyRes.data.message || 'Payment verification failed');
            }
          } catch (error) {
            Alert.alert('Verification Failed', 'Payment was processed but verification failed. Please contact support with your transaction ID: ' + paymentData.razorpay_payment_id);
          } finally {
            setLoading(false);
          }
        })
        .catch((err) => {
          setLoading(false);
          // Handle user cancellation separately
          if (err.code === 'PAYMENT_CANCELLED') {
            Alert.alert('Cancelled', 'Payment was cancelled');
          } else {
            Alert.alert('Payment Failed', err.description || 'Error processing payment');
          }
        });

    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Something went wrong. Try again.');
    }
  };

  // Share receipt
  const shareReceipt = async () => {
    if (!paymentDetails) return;
    
    try {
      await Share.share({
        message: `Payment Receipt\n\nTransaction ID: ${transactionId}\nAmount: ₹${paymentDetails.total_amount || total}\nDate: ${paymentDate}\n\nThank you for your payment!`
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share receipt');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar backgroundColor="#5f259f" barStyle="dark-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#5f259f', '#6739b7']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Make Payment</Text>
      </LinearGradient>
      
      <View style={styles.content}>
        {paymentSuccess ? (
          <View style={styles.card}>
            <View style={styles.successIcon}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successAmount}>₹{paymentDetails?.total_amount || total}</Text>
            
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionId}>Transaction ID:</Text>
              <Text style={styles.transactionIdValue}>{transactionId}</Text>
              <Text style={styles.transactionDate}>
                {paymentDate || new Date().toLocaleString()}
              </Text>
              
              {paymentDetails && (
                <View style={styles.receiptDetails}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Base Amount:</Text>
                    <Text style={styles.receiptValue}>₹{paymentDetails.base_amount || baseAmount}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Transaction Fee:</Text>
                    <Text style={styles.receiptValue}>₹{paymentDetails.fee_amount || fee}</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabelTotal}>Total Amount:</Text>
                    <Text style={styles.receiptValueTotal}>₹{paymentDetails.total_amount || total}</Text>
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.shareButton]} 
                onPress={shareReceipt}
              >
                <Text style={styles.actionButtonText}>SHARE RECEIPT</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.doneButton]} 
                onPress={() => {
                  setAmount('');
                  setPaymentSuccess(false);
                  setPaymentDetails(null);
                }}
              >
                <Text style={styles.actionButtonText}>NEW PAYMENT</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Payment Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Enter Payment Details</Text>
              
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  maxLength={7} // Limit to reasonable amount length
                />
              </View>
              
              <Text style={styles.amountLabel}>Enter amount to pay</Text>
              
              <View style={styles.feeInfoContainer}>
                <Text style={styles.feeInfoText}>
                  A 10% transaction fee will be applied to your payment to cover processing costs (minimum ₹1)
                </Text>
              </View>
              
              {amount && parseFloat(amount) > 0 ? (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>Payment Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>Base Amount</Text>
                    <Text style={styles.summaryValue}>₹{baseAmount}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>Transaction Fee (10%)</Text>
                    <View style={styles.feeRow}>
                      <Text style={styles.summaryValue}>₹{fee}</Text>
                      <TouchableOpacity onPress={() => Alert.alert('Transaction Fee', 'This 10% fee covers payment processing costs, platform maintenance, and secure transaction handling. A minimum fee of ₹1 applies to all transactions.')}>
                        <Text style={styles.infoIcon}>ⓘ</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalText}>Total Amount</Text>
                    <Text style={styles.totalValue}>₹{total}</Text>
                  </View>
                </View>
              ) : null}
            </View>
            
            {/* Payment Method */}
            <View style={styles.paymentMethodCard}>
              <Text style={styles.paymentMethodTitle}>Payment Method</Text>
              <View style={styles.paymentMethod}>
                <Image 
                  source={{uri: 'https://offerplant.com/offersclub/logo.png'}} 
                  style={styles.paymentIcon}
                  resizeMode="contain"
                />
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentName}>Razorpay</Text>
                  <Text style={styles.paymentDesc}>Fast and secure payment</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
      
      {/* Pay Button - Only show when not in success state */}
      {!paymentSuccess && (
        <TouchableOpacity 
          style={[styles.payButton, (!amount || parseFloat(amount) <= 0) && styles.disabledButton]} 
          onPress={handlePayment}
          disabled={loading || !amount || parseFloat(amount) <= 0}
        >
          <LinearGradient
            colors={(!amount || parseFloat(amount) <= 0) ? ['#cccccc', '#bbbbbb'] : ['#5f259f', '#6739b7']}
            style={styles.payButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.payButtonText}>
                {amount && parseFloat(amount) > 0 ? `PAY ₹${total}` : 'ENTER AMOUNT'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#5f259f',
    marginBottom: 8,
    paddingBottom: 8,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5f259f',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  feeInfoContainer: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#5f259f',
    marginBottom: 10,
  },
  feeInfoText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  summaryContainer: {
    backgroundColor: '#f9f9ff',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  infoIcon: {
    marginLeft: 6,
    color: '#5f259f',
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5f259f',
  },
  paymentMethodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  paymentIcon: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  paymentDesc: {
    fontSize: 12,
    color: '#888',
  },
  payButton: {
    margin: 16,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#5f259f',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  disabledButton: {
    shadowOpacity: 0.1,
  },
  payButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  
  // Success screen styles
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5f259f',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  successAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#5f259f',
    textAlign: 'center',
    marginBottom: 24,
  },
  transactionDetails: {
    backgroundColor: '#f9f9ff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  transactionId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transactionIdValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  doneButton: {
    backgroundColor: '#5f259f',
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: '#3e7eed',
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Receipt details in success screen
  receiptDetails: {
    width: '100%',
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 14,
    color: '#666',
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  receiptLabelTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptValueTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#5f259f',
  }
});