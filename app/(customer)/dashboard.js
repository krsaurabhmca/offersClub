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
// OneSignal for push notifications
import { OneSignal } from 'react-native-onesignal';

const { width, height } = Dimensions.get('window');

export default function DashboardScreen() {
  // State management for dashboard data
  const [userProfile, setUserProfile] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  // OneSignal notification permission state
  const [notificationPermission, setNotificationPermission] = useState(false);

  // Initialize dashboard data and OneSignal on component mount
  useEffect(() => {
    loadUserProfile();
    loadDashboardData();
    loadCategories();
    setupOneSignal();
  }, []);

  /**
   * Setup OneSignal push notifications
   * Handles permission requests and event listeners
   */
  const setupOneSignal = async () => {
    try {
      // Check existing notification permission
      const permission = await OneSignal.Notifications.getPermissionAsync();
      setNotificationPermission(permission);
      
      // Request permission if not already granted
      if (!permission) {
        const result = await OneSignal.Notifications.requestPermission(true);
        setNotificationPermission(result);
      }
      
      // Handle notifications received when app is in foreground
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', event => {
        console.log('Notification received in foreground:', event);
        event.preventDefault();
        event.getNotification().display();
      });
      
      // Handle notification clicks for navigation
      OneSignal.Notifications.addEventListener('click', event => {
        console.log('Notification clicked:', event);
        const data = event.notification.additionalData;
        
        // Navigate based on notification data
        if (data?.screen) {
          router.push(data.screen);
        } else if (data?.type) {
          switch(data.type) {
            case 'offer':
              router.push('/offers');
              break;
            case 'transaction':
              router.push('/transaction-history');
              break;
            case 'merchant':
              router.push('/nearby-merchants');
              break;
            default:
              // Default navigation if type is not recognized
              break;
          }
        }
      });
    } catch (error) {
      console.error('OneSignal setup error:', error);
    }
  };

  /**
   * Load user profile data from API
   * Also handles OneSignal user linking
   */
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
        // Store user data locally
        await AsyncStorage.setItem('user_name', response.data.name || '');
        await AsyncStorage.setItem('user_email', response.data.email || '');
        await AsyncStorage.setItem('user_address', response.data.address || '');
        
        // Link user with OneSignal for targeted notifications
        await linkUserWithOneSignal(customerId);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  /**
   * Link user with OneSignal for targeted push notifications
   * @param {string} userId - Customer ID to link with OneSignal
   */
  const linkUserWithOneSignal = async (userId) => {
    try {
      // Set external user ID in OneSignal
      await OneSignal.login(userId.toString());
      
      // Add user tags for segmentation and targeting
      await OneSignal.User.addTags({
        userType: 'customer',
        customer_id: userId,
        wallet: userProfile.wallet || '0'
      });
      
      console.log('User linked with OneSignal:', userId);
      
      // Get device push subscription ID and update on server
      const deviceId = await OneSignal.User.pushSubscription.getIdAsync();
      if (deviceId) {
        await updateDeviceIdOnServer(userId, deviceId);
      }
    } catch (error) {
      console.error('Error linking user with OneSignal:', error);
    }
  };

  /**
   * Update device ID on server for push notification targeting
   * @param {string} userId - Customer ID
   * @param {string} deviceId - OneSignal device ID
   */
  const updateDeviceIdOnServer = async (userId, deviceId) => {
    try {
      await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=update_customer_profile',
        { 
          'id': parseInt(userId),
          'fcm_token': deviceId
        }
      );
      
      console.log('Device ID updated on server for user:', userId);
    } catch (error) {
      console.error('Error updating device ID on server:', error);
    }
  };

  /**
   * Load dashboard summary data from API
   */
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
    }
  };

  /**
   * Load categories for merchant filtering
   */
  const loadCategories = async () => {
    try {
      const response = await axios.get(
        'https://offersclub.offerplant.com/opex/api.php?task=get_categories'
      );

      if (response.data && response.data.status === 'success') {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle pull-to-refresh functionality
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUserProfile(), loadDashboardData(), loadCategories()]);
    setRefreshing(false);
  }, []);

  /**
   * Handle wallet withdrawal request
   * Validates minimum balance and shows confirmation
   */
  const handleWithdrawRequest = async () => {
    const walletAmount = parseFloat(userProfile.wallet || 0);
    
    // Check minimum withdrawal amount
    if (walletAmount < 50) {
      Alert.alert(
        'Insufficient Balance', 
        `Minimum ₹50 required for withdrawal. Your current balance is ${formatCurrency(walletAmount)}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Confirm withdrawal request
    Alert.alert(
      'Withdraw Request',
      `Available Balance: ${formatCurrency(walletAmount)}\n\nDo you want to request a withdrawal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Withdrawal',
          onPress: async () => {
            setWithdrawLoading(true);
            try {
              const customerId = await AsyncStorage.getItem("customer_id");
              // TODO: Implement actual withdrawal API call
              // const response = await axios.post('your-withdraw-endpoint', {
              //   customer_id: customerId,
              //   amount: walletAmount
              // });
              
              // Simulated success response
              setTimeout(() => {
                setWithdrawLoading(false);
                Alert.alert('Success', 'Withdrawal request submitted successfully!');
              }, 2000);
            } catch (error) {
              setWithdrawLoading(false);
              Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
            }
          }
        }
      ]
    );
  };

  /**
   * Handle user logout
   * Clears local storage and OneSignal session
   */
  const logout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          // Logout from OneSignal to stop receiving notifications
          await OneSignal.logout();
          // Clear all local storage
          await AsyncStorage.clear();
          // Navigate to login screen
          router.replace("/");
        },
      },
    ]);
  };

  /**
   * Get greeting based on current time
   * @returns {string} Time-based greeting message
   */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  /**
   * Get user initials for avatar display
   * @param {string} name - User's full name
   * @returns {string} User initials (max 2 characters)
   */
  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  /**
   * Format currency amount in Indian Rupees
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  /**
   * Handle category selection and navigation
   * @param {Object} category - Selected category object
   */
  const handleCategoryPress = (category) => {
    router.push({
      pathname: "/nearby-merchants",
      params: { 
        categoryId: category.id,
        categoryName: category.name 
      }
    });
  };

  /**
   * Render notification permission toggle button
   * Shows current permission status and allows enabling notifications
   */
  const renderNotificationPermissionButton = () => {
    return (
      <QuickActionItem
        icon={
          notificationPermission 
            ? <Ionicons name="notifications" size={28} color="#5f259f" /> 
            : <Ionicons name="notifications-off" size={28} color="#ff4757" />
        }
        title={notificationPermission ? "Notifications On" : "Enable Notifications"}
        onPress={async () => {
          if (!notificationPermission) {
            // Request notification permission
            const result = await OneSignal.Notifications.requestPermission(true);
            setNotificationPermission(result);
            if (result) {
              Alert.alert('Success', 'Notifications enabled! You will now receive updates about offers and transactions.');
            }
          } else {
            Alert.alert('Notifications', 'Push notifications are already enabled for this app.');
          }
        }}
      />
    );
  };

  /**
   * Category item component for horizontal scroll
   */
  const CategoryItem = ({ category }) => (
    <TouchableOpacity 
      style={styles.categoryItem} 
      onPress={() => handleCategoryPress(category)}
      activeOpacity={0.7}
    >
      <View style={styles.categoryIconContainer}>
        <Ionicons 
          name={category.icon} 
          size={24} 
          color="#5f259f" 
        />
      </View>
      <Text style={styles.categoryTitle} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  /**
   * Quick action item component for dashboard services
   */
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

  // Show loading spinner while data is being fetched
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
      
      {/* Header Section with User Info */}
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
            <Ionicons name="person-circle-outline" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content with Pull-to-Refresh */}
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
        {/* Wallet Balance Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View>
              <Text style={styles.walletLabel}>OffersClub Wallet</Text>
              <View style={styles.walletStatus}>
                <View style={[styles.statusDot, { 
                  backgroundColor: userProfile.status === 'ACTIVE' ? '#00C851' : '#ff4757' 
                }]} />
                <Text style={styles.statusText}>{userProfile.status || 'ACTIVE'}</Text>
              </View>
            </View>
            <View style={styles.walletAmountSection}>
              <Text style={styles.walletAmount}>
                {formatCurrency(parseFloat(userProfile.wallet || 0))}
              </Text>
            </View>
          </View>
          
          {/* Withdrawal Request Button */}
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              parseFloat(userProfile.wallet || 0) < 50 && styles.withdrawButtonDisabled
            ]}
            onPress={handleWithdrawRequest}
            disabled={withdrawLoading || parseFloat(userProfile.wallet || 0) < 50}
            activeOpacity={0.8}
          >
            {withdrawLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name="account-balance-wallet" size={20} color="#fff" />
                <Text style={styles.withdrawButtonText}>
                  {parseFloat(userProfile.wallet || 0) < 50 ? 'Minimum ₹50 Required' : 'Request Withdrawal'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          
          {parseFloat(userProfile.wallet || 0) < 50 && (
            <Text style={styles.minimumText}>
              Minimum withdrawal amount is ₹50
            </Text>
          )}
        </View>

        {/* Transaction Summary Card */}
        {dashboardData?.transactions && (
          <TouchableOpacity 
            style={styles.transactionCard}
            onPress={() => router.push("/transaction-history")}
            activeOpacity={0.8}
          >
            <View style={styles.transactionHeader}>
              <View>
                <Text style={styles.transactionTitle}>Transaction Summary</Text>
                <Text style={styles.transactionSubtitle}>Tap to view detailed history</Text>
              </View>
              <View style={styles.viewAllContainer}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#5f259f" />
              </View>
            </View>
            
            {/* Transaction Statistics */}
            <View style={styles.transactionStats}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <MaterialIcons name="account-balance-wallet" size={20} color="#5f259f" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>
                    {formatCurrency(dashboardData.transactions.summary.total_amount)}
                  </Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <MaterialIcons name="receipt" size={20} color="#5f259f" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>
                    {dashboardData.transactions.counts.total}
                  </Text>
                  <Text style={styles.statLabel}>Transactions</Text>
                </View>
              </View>
            </View>
            
            {/* Transaction Breakdown by Status */}
            <View style={styles.transactionBreakdown}>
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#00C851' }]} />
                  <Text style={styles.breakdownLabel}>Successful</Text>
                </View>
                <View style={styles.breakdownValues}>
                  <Text style={styles.breakdownAmount}>
                    {formatCurrency(dashboardData.transactions.summary.total_confirmed_amount)}
                  </Text>
                  <Text style={styles.breakdownCount}>
                    ({dashboardData.transactions.counts.confirmed} transactions)
                  </Text>
                </View>
              </View>
              
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#FF8800' }]} />
                  <Text style={styles.breakdownLabel}>Pending</Text>
                </View>
                <View style={styles.breakdownValues}>
                  <Text style={styles.breakdownAmount}>
                    {formatCurrency(dashboardData.transactions.summary.total_pending_amount)}
                  </Text>
                  <Text style={styles.breakdownCount}>
                    ({dashboardData.transactions.counts.pending} transactions)
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Categories Section */}
        <View style={styles.categoriesCard}>
          <View style={styles.categoriesHeader}>
            <Text style={styles.cardTitle}>Shop by Categories</Text>
            <TouchableOpacity onPress={() => router.push("/nearby-merchants")}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.slice(0, 8).map((category) => (
              <CategoryItem key={category.id} category={category} />
            ))}
            {categories.length > 8 && (
              <TouchableOpacity 
                style={styles.categoryItem} 
                onPress={() => router.push("/nearby-merchants")}
                activeOpacity={0.7}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons name="ellipsis-horizontal" size={24} color="#5f259f" />
                </View>
                <Text style={styles.categoryTitle}>View All</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Essential Services - Quick Actions Grid */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Essential Services</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionItem
              icon={<MaterialCommunityIcons name="qrcode-scan" size={28} color="#5f259f" />}
              title="Scan QR Code"
              onPress={() => router.push("/qr-scanner")}
            />
            <QuickActionItem
              icon={<MaterialIcons name="local-offer" size={28} color="#5f259f" />}
              title="Special Offers"
              onPress={() => router.push("/offers")}
              notification={dashboardData?.offers?.active?.toString()}
            />
            {/* Notification Permission Button */}
            {renderNotificationPermissionButton()}
            
            <QuickActionItem
              icon={<MaterialIcons name="history" size={28} color="#5f259f" />}
              title="Transaction History"
              onPress={() => router.push("/transaction-history")}
            />
            <QuickActionItem
              icon={<Ionicons name="person-outline" size={28} color="#5f259f" />}
              title="My Profile"
              onPress={() => router.push("/profile")}
            />
            <QuickActionItem
              icon={<FontAwesome5 name="wallet" size={24} color="#5f259f" />}
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

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

// Styles remain the same as in your original code
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
    alignItems: 'flex-end',
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
    textTransform: 'capitalize',
  },
  profileButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  // Enhanced Wallet Card Styles
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  walletLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
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
  walletAmountSection: {
    alignItems: 'flex-end',
  },
  walletAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5f259f',
  },
  withdrawButton: {
    backgroundColor: '#5f259f',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#5f259f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
    elevation: 0,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  minimumText: {
    fontSize: 12,
    color: '#ff4757',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Enhanced Transaction Card Styles
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  transactionSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#5f259f',
    fontWeight: '500',
    marginRight: 4,
  },
  transactionStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5f259f',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 12,
  },
  transactionBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    paddingTop: 16,
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  breakdownValues: {
    alignItems: 'flex-end',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  breakdownCount: {
    fontSize: 11,
    color: '#666',
  },
  // Categories Styles
  categoriesCard: {
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
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoriesScroll: {
    paddingRight: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryTitle: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
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
  bottomPadding: {
    height: 20,
  },
});