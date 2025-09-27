import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons
} from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get('window');

export default function DashboardScreen() {
  const [userProfile, setUserProfile] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadDashboardData();
  }, []);

  const loadUserProfile = async () => {
    try {
      const customerId = await AsyncStorage.getItem("customer_id");
      if (!customerId) return;

      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=get_customer_profile',
        { customer_id: parseInt(customerId) }
      );

      if (response.data && response.data.id) {
        setUserProfile(response.data);
        await AsyncStorage.setItem('user_name', response.data.name || '');
        await AsyncStorage.setItem('user_email', response.data.email || '');
        await AsyncStorage.setItem('user_address', response.data.address || '');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const customerId = await AsyncStorage.getItem("customer_id");
      if (!customerId) {
        setLoading(false);
        return;
      }

      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=customer_dashboard',
        { customer_id: parseInt(customerId) }
      );

      if (response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUserProfile(), loadDashboardData()]);
    setRefreshing(false);
  }, []);

  const logout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace("/");
        },
      },
    ]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const QuickActionItem = ({ icon, title, onPress, notification = null }) => (
    <TouchableOpacity style={styles.quickActionItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickActionIconContainer}>
        {icon}
        {notification && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>{notification}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
        <ActivityIndicator size="large" color="#5f259f" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(userProfile.name)}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{userProfile.name || 'User'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/profile")}>
            <Ionicons name="person-circle-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

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
        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletLabel}>OffersClub Wallet</Text>
            <View style={styles.walletStatus}>
              <View style={[styles.statusDot, { 
                backgroundColor: userProfile.status === 'ACTIVE' ? '#00C851' : '#ff4757' 
              }]} />
              <Text style={styles.statusText}>{userProfile.status || 'ACTIVE'}</Text>
            </View>
          </View>
          <Text style={styles.walletAmount}>
            {formatCurrency(parseFloat(userProfile.wallet || 0))}
          </Text>
          <View style={styles.walletActions}>
            <TouchableOpacity style={styles.walletAction} onPress={() => router.push("/qr-scanner")}>
              <MaterialCommunityIcons name="qrcode-scan" size={20} color="#5f259f" />
              <Text style={styles.walletActionText}>Scan & Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.walletAction} onPress={() => router.push("/nearby-merchants")}>
              <Ionicons name="location-outline" size={20} color="#5f259f" />
              <Text style={styles.walletActionText}>Find Stores</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.walletAction} onPress={() => router.push("/transaction-history")}>
              <MaterialIcons name="history" size={20} color="#5f259f" />
              <Text style={styles.walletActionText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction Summary */}
        {dashboardData?.transactions && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Your Transaction Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {formatCurrency(dashboardData.transactions.summary.total_amount)}
                </Text>
                <Text style={styles.summaryLabel}>Total Spent</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {dashboardData.transactions.counts.total}
                </Text>
                <Text style={styles.summaryLabel}>Transactions</Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowItem}>
                <View style={[styles.statusDot, { backgroundColor: '#00C851' }]} />
                <Text style={styles.summaryRowText}>
                  Successful: {formatCurrency(dashboardData.transactions.summary.total_confirmed_amount)} ({dashboardData.transactions.counts.confirmed})
                </Text>
              </View>
              <View style={styles.summaryRowItem}>
                <View style={[styles.statusDot, { backgroundColor: '#FF8800' }]} />
                <Text style={styles.summaryRowText}>
                  Pending: {formatCurrency(dashboardData.transactions.summary.total_pending_amount)} ({dashboardData.transactions.counts.pending})
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions - Your App Features */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionItem
              icon={<MaterialCommunityIcons name="qrcode-scan" size={32} color="#5f259f" />}
              title="Scan QR Code"
              onPress={() => router.push("/qr-scanner")}
            />
            <QuickActionItem
              icon={<Ionicons name="location-outline" size={32} color="#5f259f" />}
              title="Nearby Merchants"
              onPress={() => router.push("/nearby-merchants")}
            />
            <QuickActionItem
              icon={<MaterialIcons name="local-offer" size={32} color="#5f259f" />}
              title="Special Offers"
              onPress={() => router.push("/offers")}
              notification={dashboardData?.offers?.active?.toString()}
            />
            <QuickActionItem
              icon={<MaterialIcons name="history" size={32} color="#5f259f" />}
              title="Transaction History"
              onPress={() => router.push("/transaction-history")}
            />
            <QuickActionItem
              icon={<Ionicons name="person-outline" size={32} color="#5f259f" />}
              title="My Profile"
              onPress={() => router.push("/profile")}
            />
            <QuickActionItem
              icon={<FontAwesome5 name="wallet" size={28} color="#5f259f" />}
              title="Wallet Details"
              onPress={() => router.push("/profile")}
            />
          </View>
        </View>

        {/* OffersClub Services */}
        <View style={styles.businessCard}>
          <View style={styles.businessHeader}>
            <Text style={styles.businessTitle}>OffersClub Services</Text>
            <TouchableOpacity onPress={() => router.push("/offers")}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.businessServices}>
            <TouchableOpacity style={styles.businessService} onPress={() => router.push("/qr-scanner")}>
              <View style={styles.businessServiceIcon}>
                <MaterialCommunityIcons name="qrcode-scan" size={24} color="#5f259f" />
              </View>
              <View style={styles.businessServiceContent}>
                <Text style={styles.businessServiceTitle}>QR Code Scanner</Text>
                <Text style={styles.businessServiceSubtitle}>Scan merchant QR codes for instant payments</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.businessService} onPress={() => router.push("/nearby-merchants")}>
              <View style={styles.businessServiceIcon}>
                <MaterialCommunityIcons name="store" size={24} color="#5f259f" />
              </View>
              <View style={styles.businessServiceContent}>
                <Text style={styles.businessServiceTitle}>Find Nearby Merchants</Text>
                <Text style={styles.businessServiceSubtitle}>Discover merchants and stores around you</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.businessService} onPress={() => router.push("/offers")}>
              <View style={styles.businessServiceIcon}>
                <MaterialIcons name="local-offer" size={24} color="#5f259f" />
              </View>
              <View style={styles.businessServiceContent}>
                <Text style={styles.businessServiceTitle}>Cashback Offers</Text>
                <Text style={styles.businessServiceSubtitle}>
                  {dashboardData?.offers?.active || 0} exclusive offers available now
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.businessService} onPress={() => router.push("/transaction-history")}>
              <View style={styles.businessServiceIcon}>
                <MaterialIcons name="receipt-long" size={24} color="#5f259f" />
              </View>
              <View style={styles.businessServiceContent}>
                <Text style={styles.businessServiceTitle}>Payment History</Text>
                <Text style={styles.businessServiceSubtitle}>
                  View all your {dashboardData?.transactions?.counts?.total || 0} transactions
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account & Settings */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <Text style={styles.accountTitle}>Account & Settings</Text>
          </View>
          <View style={styles.accountGrid}>
            <TouchableOpacity style={styles.accountItem} onPress={() => router.push("/profile")}>
              <Ionicons name="person-circle-outline" size={24} color="#5f259f" />
              <Text style={styles.accountItemText}>Profile Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountItem} onPress={() => router.push("/transaction-history")}>
              <MaterialIcons name="history" size={24} color="#5f259f" />
              <Text style={styles.accountItemText}>Payment History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountItem} onPress={() => router.push("/offers")}>
              <MaterialIcons name="card-giftcard" size={24} color="#5f259f" />
              <Text style={styles.accountItemText}>My Offers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountItem} onPress={() => {}}>
              <Ionicons name="help-circle-outline" size={24} color="#5f259f" />
              <Text style={styles.accountItemText}>Help & Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Profile Summary */}
        <View style={styles.profileSummaryCard}>
          <View style={styles.profileSummaryHeader}>
            <View style={styles.profileSummaryUser}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{getInitials(userProfile.name)}</Text>
              </View>
              <View style={styles.profileSummaryInfo}>
                <Text style={styles.profileSummaryName}>{userProfile.name}</Text>
                <Text style={styles.profileSummaryDetails}>
                  ID: {userProfile.id} • {userProfile.mobile}
                </Text>
                <Text style={styles.profileSummaryEmail}>{userProfile.email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push("/profile")}>
              <Feather name="edit-2" size={16} color="#5f259f" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutCard} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#ff4757" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

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
    backgroundColor: '#5f259f',
    paddingTop: 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  profileButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  walletCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  walletStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  walletAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  walletAction: {
    alignItems: 'center',
    gap: 4,
  },
  walletActionText: {
    fontSize: 12,
    color: '#5f259f',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5f259f',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  summaryRow: {
    gap: 8,
  },
  summaryRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryRowText: {
    fontSize: 13,
    color: '#666',
  },
  quickActionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  quickActionIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff4757',
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
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  businessCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  seeAllText: {
    fontSize: 14,
    color: '#5f259f',
    fontWeight: '500',
  },
  businessServices: {
    gap: 16,
  },
  businessService: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessServiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessServiceContent: {
    flex: 1,
  },
  businessServiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  businessServiceSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  accountCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountHeader: {
    marginBottom: 16,
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  accountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  accountItem: {
    alignItems: 'center',
    width: '48%',
    padding: 12,
    marginBottom: 12,
  },
  accountItemText: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  profileSummaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileSummaryUser: {
    flexDirection: 'row',
    flex: 1,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5f259f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileSummaryInfo: {
    flex: 1,
  },
  profileSummaryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  profileSummaryDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  profileSummaryEmail: {
    fontSize: 12,
    color: '#5f259f',
  },
  editProfileButton: {
    padding: 8,
  },
  logoutCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff4757',
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});