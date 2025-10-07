import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const API_BASE_URL = "https://offersclub.offerplant.com/opex/api.php";

const WithdrawScreen = ({ navigation }) => {
  const [customerId, setCustomerId] = useState(null);
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [successModal, setSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasBankDetails, setHasBankDetails] = useState(true);

  const MIN_WITHDRAWAL = 50;
  const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const id = await AsyncStorage.getItem("customer_id");
      if (id) {
        setCustomerId(id);
        fetchWalletBalance(id);
      } else {
        Alert.alert("Error", "Customer ID not found");
      }
    } catch (error) {
      console.error("Error loading customer ID:", error);
    }
  };

  const fetchWalletBalance = async (id) => {
    try {
      setFetchingBalance(true);
      const response = await fetch(`${API_BASE_URL}?task=customer_wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customer_id: id }),
      });

      const data = await response.json();
      console.log("API Response:", data); // Debug log
      
      if (data.status === "success" && data.data) {
        // Handle wallet balance
        const balance = data.data.wallet || "0.00";
        setWalletBalance(balance);
        
        // Check if bank details exist (not null and not empty)
        const hasAccount = data.data.account_number && data.data.account_number !== null && data.data.account_number.trim() !== "";
        const hasIFSC = data.data.ifsc && data.data.ifsc !== null && data.data.ifsc.trim() !== "";
        const hasUPI = data.data.upi && data.data.upi !== null && data.data.upi.trim() !== "";
        
        const bankDetailsExist = (hasAccount && hasIFSC) || hasUPI;
        setHasBankDetails(bankDetailsExist);
        
        console.log("Bank Details Status:", bankDetailsExist); // Debug log
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      Alert.alert("Error", "Failed to fetch wallet balance");
    } finally {
      setFetchingBalance(false);
    }
  };

  const validateAmount = () => {
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount)) {
      setErrorMessage("Please enter a valid amount");
      return false;
    }

    if (numAmount < MIN_WITHDRAWAL) {
      setErrorMessage(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`);
      return false;
    }

    if (numAmount % MIN_WITHDRAWAL !== 0) {
      setErrorMessage(`Amount must be in multiples of ₹${MIN_WITHDRAWAL}`);
      return false;
    }

    if (numAmount > parseFloat(walletBalance)) {
      setErrorMessage("Insufficient balance");
      return false;
    }

    setErrorMessage("");
    return true;
  };

  const handleWithdraw = async () => {
    // Check bank details before proceeding
    if (!hasBankDetails) {
      Alert.alert(
        "Bank Details Required",
        "Please add your bank details to proceed with withdrawal",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Details", onPress: () => router.push("/AccountScreen") }
        ]
      );
      return;
    }

    if (!validateAmount()) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}?task=withdraw_request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId,
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setSuccessModal(true);
        setAmount("");
        // Refresh balance after successful withdrawal
        setTimeout(() => {
          fetchWalletBalance(customerId);
        }, 1500);
      } else {
        Alert.alert("Error", data.msg || "Withdrawal request failed");
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectQuickAmount = (value) => {
    setAmount(value.toString());
    setErrorMessage("");
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safecontainer} edges={["top", "bottom", "left", "right"]}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#5f259f" />

          {/* Header */}
          <LinearGradient colors={["#5f259f", "#7c3aed"]} style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Withdraw Money</Text>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Wallet Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Ionicons name="wallet-outline" size={24} color="#5f259f" />
                <Text style={styles.balanceLabel}>Available Balance</Text>
              </View>
              {fetchingBalance ? (
                <ActivityIndicator size="small" color="#5f259f" />
              ) : (
                <Text style={styles.balanceAmount}>₹{walletBalance}</Text>
              )}
              <TouchableOpacity
                onPress={() => fetchWalletBalance(customerId)}
                style={styles.refreshButton}
              >
                <Ionicons name="refresh" size={16} color="#5f259f" />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* Bank Details Warning Card */}
            {!hasBankDetails && (
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={24} color="#f59e0b" />
                  <Text style={styles.warningTitle}>Bank Details Required</Text>
                </View>
                <Text style={styles.warningText}>
                  Please add your bank account or UPI details to withdraw money from your wallet.
                </Text>
                <TouchableOpacity
                  style={styles.addBankButton}
                  onPress={() => router.push("/AccountScreen")}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.addBankButtonText}>Add Bank Details</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Amount Input Section */}
            <View style={[styles.inputSection, !hasBankDetails && styles.disabledSection]}>
              <Text style={styles.sectionTitle}>Enter Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(text) => {
                    if (hasBankDetails) {
                      setAmount(text.replace(/[^0-9]/g, ""));
                      setErrorMessage("");
                    }
                  }}
                  editable={hasBankDetails}
                />
              </View>
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : (
                <Text style={styles.hintText}>
                  Min ₹{MIN_WITHDRAWAL} • Multiples of ₹{MIN_WITHDRAWAL}
                </Text>
              )}
            </View>

            {/* Quick Amount Buttons */}
            <View style={[styles.quickAmountSection, !hasBankDetails && styles.disabledSection]}>
              <Text style={styles.sectionTitle}>Quick Select</Text>
              <View style={styles.quickAmountGrid}>
                {QUICK_AMOUNTS.map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.quickAmountButton,
                      amount === value.toString() &&
                        styles.quickAmountButtonActive,
                      (value > parseFloat(walletBalance) || !hasBankDetails) &&
                        styles.quickAmountButtonDisabled,
                    ]}
                    onPress={() => selectQuickAmount(value)}
                    disabled={value > parseFloat(walletBalance) || !hasBankDetails}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        amount === value.toString() &&
                          styles.quickAmountTextActive,
                        (value > parseFloat(walletBalance) || !hasBankDetails) &&
                          styles.quickAmountTextDisabled,
                      ]}
                    >
                      ₹{value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#5f259f"
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Important Note</Text>
                <Text style={styles.infoText}>
                  • Withdrawal requests are processed within 24-48 hours{"\n"}•
                  Amount will be credited to your registered bank account{"\n"}•
                  Only one withdrawal request allowed at a time
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Withdraw Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.withdrawButton,
                (!amount || loading || !hasBankDetails) && styles.withdrawButtonDisabled,
              ]}
              onPress={handleWithdraw}
              disabled={!amount || loading || !hasBankDetails}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.withdrawButtonText}>
                    Proceed to Withdraw
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Success Modal */}
          <Modal
            visible={successModal}
            transparent
            animationType="fade"
            onRequestClose={() => setSuccessModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                </View>
                <Text style={styles.modalTitle}>Request Submitted!</Text>
                <Text style={styles.modalMessage}>
                  Your withdrawal request of ₹{amount} has been received
                  successfully. You'll be notified once it's processed.
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setSuccessModal(false);
                    router.back();
                  }}
                >
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  safecontainer: {
    flex: 1,
    backgroundColor: "#5f259f",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  balanceCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1f2937",
    marginVertical: 8,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  refreshText: {
    color: "#5f259f",
    fontSize: 14,
    marginLeft: 4,
    fontWeight: "600",
  },
  warningCard: {
    backgroundColor: "#fffbeb",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#fbbf24",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#d97706",
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
    marginBottom: 16,
  },
  addBankButton: {
    backgroundColor: "#5f259f",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addBankButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 8,
  },
  disabledSection: {
    opacity: 0.5,
  },
  inputSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#5f259f",
    paddingBottom: 8,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#5f259f",
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    padding: 0,
  },
  hintText: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginLeft: 4,
  },
  quickAmountSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickAmountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  quickAmountButton: {
    width: "31%",
    margin: "1%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  quickAmountButtonActive: {
    backgroundColor: "#5f259f",
    borderColor: "#5f259f",
  },
  quickAmountButtonDisabled: {
    opacity: 0.4,
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  quickAmountTextActive: {
    color: "#fff",
  },
  quickAmountTextDisabled: {
    color: "#999",
  },
  infoCard: {
    backgroundColor: "#f0e7ff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5f259f",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#6b21a8",
    lineHeight: 18,
  },
  footer: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  withdrawButton: {
    backgroundColor: "#5f259f",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#5f259f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  withdrawButtonDisabled: {
    backgroundColor: "#d1d5db",
    elevation: 0,
  },
  withdrawButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: "85%",
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: "#5f259f",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default WithdrawScreen;