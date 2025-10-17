import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native"; // Import useFocusEffect
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  RefreshControl,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { OneSignal } from "react-native-onesignal";

const { width } = Dimensions.get("window");

export default function MerchantDashboard() {
  const [merchantData, setMerchantData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const fadeAnim = new Animated.Value(1);

  // Function to load all data
  const loadAllData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      await Promise.all([loadMerchantData(), loadDashboardData()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    setupOneSignal();
    loadAllData(true);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Auto-update when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Don't show loading indicator on focus to avoid flickering
      loadAllData(false);

      // Subtle animation to indicate refresh
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      return () => {
        // Clean up any subscriptions or timers if needed
      };
    }, [loadAllData])
  );

  /**
   * Setup OneSignal push notifications
   * Updated for latest OneSignal SDK
   */
  const setupOneSignal = async () => {
    try {
      // Initialize OneSignal
      OneSignal.initialize("c326b200-d8f3-4fae-99c8-a39b0d8becd0"); // Replace with your actual app ID

      // Request notification permission
      const permission = await OneSignal.Notifications.requestPermission(true);
      setNotificationPermission(permission);

      // Handle notification received when app is in foreground
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        (event) => {
          console.log("Notification received in foreground:", event);
          // Show notification even when app is in foreground
          event.getNotification().display();
        }
      );

      // Handle notification clicks
      OneSignal.Notifications.addEventListener("click", (event) => {
        console.log("Notification clicked:", event);
        const data = event.notification.additionalData;

        // Handle navigation based on notification type
        if (data?.type === "transaction") {
          router.push("/merchant-txn");
        } else if (data?.type === "offer") {
          router.push("/MyOffersScreen");
        }
      });

      console.log("OneSignal setup completed");
    } catch (error) {
      console.error("OneSignal setup error:", error);
    }
  };

  /**
   * Link user with OneSignal for targeted notifications
   */
  const linkUserWithOneSignal = async (userId, merchantData) => {
    try {
      // Login user with OneSignal
      await OneSignal.login(userId.toString());

      // Set user tags for segmentation
      await OneSignal.User.addTags({
        userType: "merchant",
        merchant_id: userId.toString(),
        business_name: merchantData.business_name || "",
        wallet: merchantData.wallet || "0",
        status: merchantData.status || "ACTIVE",
      });

      console.log("User linked with OneSignal:", userId);

      // Get push subscription ID and update on server
      const pushSubscription = OneSignal.User.pushSubscription;
      const deviceId = await pushSubscription.getIdAsync();

      if (deviceId) {
        await updateDeviceIdOnServer(userId, deviceId);
      }
    } catch (error) {
      console.error("Error linking user with OneSignal:", error);
    }
  };

  /**
   * Update device ID on server
   */
  const updateDeviceIdOnServer = async (userId, deviceId) => {
    try {
      await axios.post(
        "https://offersclub.offerplant.com/opex/api.php?task=update_merchant_profile",
        {
          id: parseInt(userId),
          fcm_token: deviceId,
        }
      );

      console.log("Device ID updated on server for user:", userId);
    } catch (error) {
      console.error("Error updating device ID on server:", error);
    }
  };

  const loadMerchantData = async () => {
    try {
      const merchantId = await AsyncStorage.getItem("merchant_id");
      if (!merchantId) {
        router.replace("/");
        return;
      }

      const response = await axios.post(
        "https://offersclub.offerplant.com/opex/api.php?task=get_merchant_profile",
        { merchant_id: parseInt(merchantId) }
      );

      if (response.data && response.data.id) {
        setMerchantData(response.data);
        setWalletBalance(parseFloat(response.data.wallet || 0));

        // Link user with OneSignal after profile is loaded
        await linkUserWithOneSignal(response.data.id, response.data);
      }
    } catch (error) {
      console.error("Error loading merchant data:", error);
      // Don't show alert on auto-refresh to avoid annoying the user
      if (loading) {
        Alert.alert("Error", "Failed to load merchant data");
      }
    }
  };

  /**
   * Load dashboard summary data from new API
   */
  const loadDashboardData = async () => {
    try {
      const merchantId = await AsyncStorage.getItem("merchant_id");
      if (!merchantId) return;

      const response = await axios.post(
        "https://offersclub.offerplant.com/opex/api.php?task=merchant_dashboard",
        { merchant_id: merchantId }
      );

      if (response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData(false);
    setRefreshing(false);
  }, [loadAllData]);

  const handleDownloadQR = () => {
    router.push("/QRCodeScreen");
  };

  const shareQRCode = async () => {
    try {
      const qrUrl = `https://offersclub.offerplant.com/qr/${merchantData.qr_code}`;
      await Share.share({
        message: `Pay me using OffersClub! QR Code: ${qrUrl}\nBusiness: ${merchantData.business_name}`,
        url: qrUrl,
        title: "My Business QR Code",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share QR code");
    }
  };

  const MerchantReport = () => {
    router.push("/MerchantReport");
  };

  const handleViewTransactions = (type) => {
    router.push({
      pathname: "/merchant-txn",
      params: { filter: type },
    });
  };

  const handleAddCoins = () => {
    router.push("/merchant-wallet-add");
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          // Logout from OneSignal
          try {
            await OneSignal.logout();
          } catch (error) {
            console.error("OneSignal logout error:", error);
          }

          await AsyncStorage.clear();
          router.replace("/");
        },
      },
    ]);
  };

  const formatCurrency = (amount, useSymbol = true) => {
    return new Intl.NumberFormat("en-IN", {
      style: useSymbol ? "currency" : "decimal",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const QuickActionCard = ({
    icon,
    title,
    subtitle,
    onPress,
    color = "#5f259f",
    notification,
  }) => (
    <TouchableOpacity
      style={styles.quickActionCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
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

  const SummaryCard = ({ title, amount, count, color, onPress, icon }) => (
    <TouchableOpacity
      style={styles.summaryCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIcon, { backgroundColor: color }]}>
          {icon}
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryTitle}>{title}</Text>
          <Text style={[styles.summaryAmount, { color }]}>
            {formatCurrency(amount)}
          </Text>
          <Text style={styles.summaryCount}>
            {count} transaction{count !== 1 ? "s" : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
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
      <LinearGradient colors={["#5f259f", "#713EBE"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="store" size={24} color="#fff" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.businessName}>
                {merchantData?.business_name || "Your Business"}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {!notificationPermission && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>

        {/* Enhanced OffersCoins Section */}
        <View style={styles.walletSection}>
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Text style={styles.walletLabel}>OffersCoins Balance</Text>
              <TouchableOpacity style={styles.walletInfoButton}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.coinBalanceRow}>
              <Text style={styles.walletAmount}>
                {formatCurrency(walletBalance, false)}
              </Text>
              <TouchableOpacity
                style={styles.addCoinsButton}
                onPress={handleAddCoins}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.addCoinsText}>ADD COINS</Text>
              </TouchableOpacity>
            </View>

            {/* Cashback Display */}
            {dashboardData?.transactions?.summary?.cashback && (
              <View style={styles.cashbackContainer}>
                <MaterialIcons name="card-giftcard" size={16} color="#00C851" />
                <Text style={styles.cashbackText}>
                  Total Cashback Distributed:{" "}
                  {formatCurrency(
                    dashboardData.transactions.summary.cashback,
                    false
                  )}{" "}
                  Coins
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.content, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#5f259f"]}
          />
        }
      >
        {/* Transaction Summary */}
        {dashboardData?.transactions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Overview</Text>
            <View style={styles.summaryGrid}>
              <SummaryCard
                title="Confirmed"
                amount={
                  dashboardData.transactions.summary.total_confirmed_amount
                }
                count={dashboardData.transactions.counts.confirmed}
                color="#00C851"
                icon={
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                }
                onPress={() => handleViewTransactions("CONFIRMED")}
              />
              <SummaryCard
                title="Pending"
                amount={dashboardData.transactions.summary.total_pending_amount}
                count={dashboardData.transactions.counts.pending}
                color="#FF8800"
                icon={<Ionicons name="time" size={20} color="#fff" />}
                onPress={() => handleViewTransactions("pending")}
              />
            </View>

            {/* Total Summary Card */}
            <View style={styles.totalSummaryCard}>
              <View style={styles.totalSummaryHeader}>
                <Text style={styles.totalSummaryTitle}>
                  Total Business Volume
                </Text>
                <Text style={styles.totalSummaryAmount}>
                  {formatCurrency(
                    dashboardData.transactions.summary.total_amount
                  )}
                </Text>
              </View>
              <Text style={styles.totalSummarySubtext}>
                {dashboardData.transactions.counts.total} total transactions
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon={<MaterialIcons name="add-circle" size={28} color="#fff" />}
              title="Add OffersCoins"
              subtitle="Increase Balance"
              onPress={handleAddCoins}
              color="#FF8800"
            />

            <QuickActionCard
              icon={<MaterialIcons name="bar-chart" size={28} color="#fff" />} // Better icon for analysis
              title="Business Analysis"
              subtitle="Track & Improve"
              onPress={MerchantReport} // new handler if needed
              color="#6C63FF" // professional purple tone for analytics
            />

            <QuickActionCard
              icon={
                <MaterialCommunityIcons name="qrcode" size={28} color="#fff" />
              }
              title="My QR Code"
              subtitle="Download & Share"
              onPress={handleDownloadQR}
              color="#5f259f"
            />

            <QuickActionCard
              icon={<MaterialIcons name="analytics" size={28} color="#fff" />}
              title="Active Offers"
              subtitle="Manage Offers"
              onPress={() => router.push("/MyOffersScreen")}
              color="#3B82F6"
              notification={
                dashboardData?.offers?.active
                  ? dashboardData.offers.active
                  : null
              }
            />
          </View>
        </View>

        {/* Business Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Management</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(merchant)/profile")}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="person-outline" size={20} color="#5f259f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Update Profile</Text>
                <Text style={styles.menuSubtitle}>
                  Update business information
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/merchant-wallet-add")}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="wallet-outline" size={20} color="#5f259f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Add OffersCoins</Text>
                <Text style={styles.menuSubtitle}>
                  Increase your coin balance
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleViewTransactions("all")}
            >
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="receipt" size={20} color="#5f259f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Transaction History</Text>
                <Text style={styles.menuSubtitle}>
                  View all payments received
                </Text>
              </View>
              {dashboardData?.transactions?.counts?.total && (
                <View style={styles.transactionBadge}>
                  <Text style={styles.transactionBadgeText}>
                    {dashboardData.transactions.counts.total}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/merchant-txn")}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="people" size={20} color="#5f259f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>All Transactions</Text>
                <Text style={styles.menuSubtitle}>View & manage payments</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/HelpSupportScreen")}
            >
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="help-outline" size={20} color="#5f259f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Help & Support</Text>
                <Text style={styles.menuSubtitle}>
                  Get assistance for your business
                </Text>
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
                  <Text style={styles.accountLabel}>Mobile: </Text>
                  {merchantData.mobile}
                </Text>
                <Text style={styles.accountDetail}>
                  <Text style={styles.accountLabel}>Status: </Text>
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          merchantData.status === "ACTIVE"
                            ? "#00C851"
                            : "#FF8800",
                      },
                    ]}
                  >
                    {merchantData.status}
                  </Text>
                </Text>
                <Text style={styles.accountDetail}>
                  <Text style={styles.accountLabel}>Notifications: </Text>
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: notificationPermission ? "#00C851" : "#FF8800",
                      },
                    ]}
                  >
                    {notificationPermission ? "Enabled" : "Disabled"}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#5f259f",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  notificationButton: {
    position: "relative",
    padding: 8,
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B35",
  },
  walletSection: {
    marginTop: 10,
  },
  walletCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    flex: 1,
  },
  walletInfoButton: {
    padding: 4,
  },
  coinBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  walletAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  addCoinsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5f259f",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addCoinsText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
  },
  cashbackContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  cashbackText: {
    fontSize: 12,
    color: "#00C851",
    fontWeight: "500",
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
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 2,
  },
  summaryCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  totalSummaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#5f259f",
  },
  totalSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  totalSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  totalSummaryAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#5f259f",
  },
  totalSummarySubtext: {
    fontSize: 14,
    color: "#6B7280",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: (width - 52) / 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  transactionBadge: {
    backgroundColor: "#FF8800",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  transactionBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  accountCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "600",
  },
  accountDetails: {
    gap: 8,
  },
  accountDetail: {
    fontSize: 14,
    color: "#374151",
  },
  accountLabel: {
    fontWeight: "500",
    color: "#6B7280",
  },
  statusText: {
    fontWeight: "600",
  },
  bottomPadding: {
    height: 20,
  },
});
