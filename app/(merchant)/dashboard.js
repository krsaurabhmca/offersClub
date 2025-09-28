import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function MerchantDashboard() {
  const [merchantData, setMerchantData] = useState(null);
  const [transactions, setTransactions] = useState({ pending: [], confirmed: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    loadMerchantData();
    loadTransactions();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadMerchantData = async () => {
    try {
      const merchantId = await AsyncStorage.getItem('merchant_id');
      if (!merchantId) {
        router.replace('/');
        return;
      }

      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=get_merchant_profile',
        { merchant_id: parseInt(merchantId) }
      );

      if (response.data && response.data.id) {
        setMerchantData(response.data);
        setWalletBalance(parseFloat(response.data.wallet || 0));
      }
    } catch (error) {
      console.error('Error loading merchant data:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const merchantId = await AsyncStorage.getItem('merchant_id');
      if (!merchantId) return;

      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=merchant_transactions',
        { merchant_id: parseInt(merchantId) }
      );

      if (response.data && response.data.status === 'success') {
        const allTransactions = response.data.data || [];
        const pending = allTransactions.filter(t => t.status === 'PENDING');
        const confirmed = allTransactions.filter(t => t.status === 'CONFIRMED');
        setTransactions({ pending, confirmed });
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadMerchantData(), loadTransactions()]);
    setRefreshing(false);
  }, []);

  const handleDownloadQR = () => {
    router.push('/MerchantQRScreen');
    // if (!merchantData?.qr_code) {
    //   Alert.alert('Error', 'QR Code not available');
    //   return;
    // }

    // Alert.alert(
    //   'Download QR Code',
    //   'Choose an option to share your QR code:',
    //   [
    //     { text: 'Cancel', style: 'cancel' },
    //     { text: 'Share QR Code', onPress: shareQRCode },
    //     { text: 'View QR Code', onPress: viewQRCode }
    //   ]
    // );
  };

  const shareQRCode = async () => {
    try {
      const qrUrl = `https://offersclub.offerplant.com/qr/${merchantData.qr_code}`;
      await Share.share({
        message: `Pay me using OffersClub! QR Code: ${qrUrl}\nBusiness: ${merchantData.business_name}`,
        url: qrUrl,
        title: 'My Business QR Code'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  const viewQRCode = () => {
    router.push({
      pathname: '/qr-code-display',
      params: { 
        qrCode: merchantData.qr_code,
        businessName: merchantData.business_name
      }
    });
  };

  const handleCreateOffer = () => {
    router.push('/CreateOfferScreen');
  };

  const handleViewTransactions = (type) => {
    router.push({
      pathname: '/merchant-txn',
      params: { filter: type }
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/');
          },
        },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const QuickActionCard = ({ icon, title, subtitle, onPress, color = "#5f259f", notification }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        {icon}
        {notification && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>{notification}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const TransactionCard = ({ type, count, amount, color, onPress }) => (
    <TouchableOpacity style={styles.transactionCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.transactionHeader}>
        <View style={[styles.transactionDot, { backgroundColor: color }]} />
        <Text style={styles.transactionType}>{type}</Text>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
      <Text style={styles.transactionCount}>{count} transactions</Text>
      <Text style={[styles.transactionAmount, { color }]}>{formatCurrency(amount)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
        <ActivityIndicator size="large" color="#5f259f" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={['#5f259f', '#713EBE']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="store" size={24} color="#fff" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.businessName}>
                {merchantData?.business_name || 'Your Business'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Wallet Section */}
        <View style={styles.walletSection}>
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Text style={styles.walletLabel}>Business Wallet</Text>
              <TouchableOpacity style={styles.walletInfoButton}>
                <Ionicons name="information-circle-outline" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.walletAmount}>{formatCurrency(walletBalance)}</Text>
            <View style={styles.walletActions}>
              <TouchableOpacity style={styles.walletAction}>
                <MaterialIcons name="account-balance-wallet" size={16} color="#5f259f" />
                <Text style={styles.walletActionText}>Add Money</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.walletAction}>
                <MaterialIcons name="trending-up" size={16} color="#5f259f" />
                <Text style={styles.walletActionText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#5f259f']}
          />
        }
      >
        {/* Transaction Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Transactions</Text>
          <View style={styles.transactionGrid}>
            <TransactionCard
              type="Pending"
              count={transactions.pending.length}
              amount={transactions.pending.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)}
              color="#FF8800"
              onPress={() => handleViewTransactions('pending')}
            />
            <TransactionCard
              type="Confirmed" 
              count={transactions.confirmed.length}
              amount={transactions.confirmed.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)}
              color="#00C851"
              onPress={() => handleViewTransactions('confirmed')}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon={<MaterialCommunityIcons name="qrcode" size={28} color="#fff" />}
              title="My QR Code"
              subtitle="Download & Share"
              onPress={handleDownloadQR}
              color="#5f259f"
            />
            <QuickActionCard
              icon={<MaterialIcons name="local-offer" size={28} color="#fff" />}
              title="Create Offer"
              subtitle="Boost Sales"
              onPress={handleCreateOffer}
              color="#FF6B35"
            />
            <QuickActionCard
              icon={<Ionicons name="people" size={28} color="#fff" />}
              title="All Transactions"
              subtitle="View & Manage"
              onPress={() => router.push('/merchant-txn')}
              color="#00C851"
            />
           
            <QuickActionCard
              icon={<MaterialIcons name="analytics" size={28} color="#fff" />}
              title="Offers"
              subtitle="Active Offers"
              onPress={() => router.push('/MyOffersScreen')}
              color="#3B82F6"
            />
          </View>
        </View>

        {/* Business Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Management</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/(merchant)/profile')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="person-outline" size={20} color="#5f259f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Profile Settings</Text>
                <Text style={styles.menuSubtitle}>Update business information</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleViewTransactions('all')}
            >
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="receipt" size={20} color="#5f259f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Transaction History</Text>
                <Text style={styles.menuSubtitle}>View all payments received</Text>
              </View>
              <View style={styles.transactionBadge}>
                <Text style={styles.transactionBadgeText}>
                  {transactions.pending.length + transactions.confirmed.length}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <MaterialCommunityIcons name="store-settings" size={20} color="#5f259f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Business Settings</Text>
                <Text style={styles.menuSubtitle}>Configure payment preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="help-outline" size={20} color="#5f259f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Help & Support</Text>
                <Text style={styles.menuSubtitle}>Get assistance for your business</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Info */}
        {merchantData && (
          <View style={styles.section}>
            <View style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <Text style={styles.accountTitle}>Account Information</Text>
                <TouchableOpacity onPress={handleLogout}>
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountDetail}>
                  <Text style={styles.accountLabel}>Merchant ID: </Text>
                  {merchantData.id}
                </Text>
                <Text style={styles.accountDetail}>
                  <Text style={styles.accountLabel}>Mobile: </Text>
                  {merchantData.mobile}
                </Text>
                <Text style={styles.accountDetail}>
                  <Text style={styles.accountLabel}>Status: </Text>
                  <Text style={[styles.statusText, { 
                    color: merchantData.status === 'ACTIVE' ? '#00C851' : '#FF8800' 
                  }]}>
                    {merchantData.status}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#5f259f',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
  walletSection: {
    marginTop: 10,
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  walletInfoButton: {
    padding: 4,
  },
  walletAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  walletAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  walletActionText: {
    fontSize: 12,
    color: '#5f259f',
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  transactionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  transactionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  transactionCount: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionBadge: {
    backgroundColor: '#FF8800',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  transactionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  accountDetails: {
    gap: 8,
  },
  accountDetail: {
    fontSize: 14,
    color: '#374151',
  },
  accountLabel: {
    fontWeight: '500',
    color: '#6B7280',
  },
  statusText: {
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});