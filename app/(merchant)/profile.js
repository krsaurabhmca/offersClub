import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function BusinessInfoUpdate() {
  const [merchantData, setMerchantData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [isActivelyEditing, setIsActivelyEditing] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    loadProfileData();
    loadCategories();
  }, []);

  useEffect(() => {
    let timeoutId;
    
    if (isActivelyEditing) {
      clearTimeout(timeoutId);
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isActivelyEditing]);

  const loadProfileData = async () => {
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
        setEditData(response.data);
        setOriginalData({ ...response.data });
      } else {
        Alert.alert("Error", "Failed to load profile data");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get(
        "https://offersclub.offerplant.com/opex/api.php?task=get_categories"
      );

      if (response.data && response.data.status === "success") {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const hasChanges = () => {
    if (!originalData || !editData) return false;
    
    const fieldsToCompare = [
      'business_name',
      'contact_person',
      'mobile',
      'email',
      'category_id'
    ];

    return fieldsToCompare.some(field => {
      const original = originalData[field]?.toString() || '';
      const edited = editData[field]?.toString() || '';
      return original !== edited;
    });
  };

  const onRefresh = useCallback(async () => {
    if (isActivelyEditing || isEditing) {
      return;
    }
    
    setRefreshing(true);
    try {
      await Promise.all([loadProfileData(), loadCategories()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [isActivelyEditing, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...merchantData });
    setOriginalData({ ...merchantData });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsActivelyEditing(false);
    setEditData({ ...merchantData });
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      Alert.alert("No Changes", "No changes detected to save.");
      return;
    }

    // Validation
    if (!editData.business_name?.trim()) {
      Alert.alert("Error", "Business name is required");
      return;
    }
    if (!editData.contact_person?.trim()) {
      Alert.alert("Error", "Contact person is required");
      return;
    }
    if (!editData.mobile?.trim()) {
      Alert.alert("Error", "Mobile number is required");
      return;
    }
    if (!editData.email?.trim() || !isValidEmail(editData.email)) {
      Alert.alert("Error", "Valid email is required");
      return;
    }

    setSaving(true);
    try {
      const merchantId = await AsyncStorage.getItem("merchant_id");
      const updateData = {
        merchant_id: parseInt(merchantId),
        business_name: editData.business_name,
        contact_person: editData.contact_person,
        mobile: editData.mobile,
        email: editData.email,
        category_id: editData.category_id,
      };

      const response = await axios.post(
        "https://offersclub.offerplant.com/opex/api.php?task=update_merchant_profile",
        updateData
      );

      if (response.data && response.data.status === "success") {
        setMerchantData(editData);
        setOriginalData({ ...editData });
        setIsEditing(false);
        setIsActivelyEditing(false);
        Alert.alert("Success", "Business information updated successfully");
      } else {
        Alert.alert(
          "Error",
          response.data?.message || "Failed to update business information"
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update business information. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const selectCategory = (category) => {
    setEditData(prev => ({ ...prev, category_id: category.id }));
    setShowCategoryModal(false);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Select Category";
  };

  const getCategoryIcon = (categoryId) => {
    const icons = {
      1: "restaurant-outline",
      2: "cart-outline",
      3: "laptop-outline",
      4: "shirt-outline",
      5: "medkit-outline",
      6: "leaf-outline",
      7: "book-outline",
      8: "barbell-outline",
      9: "airplane-outline",
      10: "grid-outline",
    };
    return icons[categoryId] || "storefront-outline";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    icon,
  }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={[
          styles.inputWrapper, 
          isFocused && styles.inputWrapperFocused
        ]}>
          {icon && <View style={styles.inputIcon}>{icon}</View>}
          <TextInput
            style={[
              styles.input,
              !isEditing && styles.disabledInput,
            ]}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => {
              setIsFocused(true);
              setIsActivelyEditing(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => {
                setIsActivelyEditing(false);
              }, 2000);
            }}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            editable={isEditing}
          />
        </View>
      </View>
    );
  };

  const CategoryModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showCategoryModal}
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Business Category</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.categoryList}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  editData.category_id === category.id &&
                    styles.categoryItemActive,
                ]}
                onPress={() => selectCategory(category)}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons
                    name={getCategoryIcon(category.id)}
                    size={24}
                    color={
                      editData.category_id === category.id ? "#fff" : "#5f259f"
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.categoryName,
                    editData.category_id === category.id &&
                      styles.categoryNameActive,
                  ]}
                >
                  {category.name}
                </Text>
                {editData.category_id === category.id && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
        <ActivityIndicator size="large" color="#5f259f" />
        <Text style={styles.loadingText}>Loading Business Information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#5f259f" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={["#5f259f", "#713EBE"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Business Information</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={isEditing ? handleCancel : handleEdit}
          >
            <Ionicons
              name={isEditing ? "close" : "create-outline"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#5f259f"]}
              enabled={!isActivelyEditing && !isEditing}
              progressBackgroundColor="#fff"
            />
          }
        >
          {/* Business Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="store" size={24} color="#5f259f" />
              <Text style={styles.cardTitle}>Business Details</Text>
            </View>

            <InputField
              label="Business Name"
              value={editData.business_name || ""}
              onChangeText={(text) =>
                setEditData(prev => ({ ...prev, business_name: text }))
              }
              placeholder="Enter business name"
              icon={
                <MaterialCommunityIcons
                  name="store"
                  size={20}
                  color="#6B7280"
                />
              }
            />

            <InputField
              label="Contact Person"
              value={editData.contact_person || ""}
              onChangeText={(text) =>
                setEditData(prev => ({ ...prev, contact_person: text }))
              }
              placeholder="Enter contact person name"
              icon={
                <Ionicons name="person-outline" size={20} color="#6B7280" />
              }
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Business Category</Text>
              <TouchableOpacity
                style={[
                  styles.categorySelector,
                  !isEditing && styles.disabledSelector,
                ]}
                onPress={() => isEditing && setShowCategoryModal(true)}
                disabled={!isEditing}
              >
                <View style={styles.categorySelectorContent}>
                  <Ionicons
                    name={getCategoryIcon(editData.category_id)}
                    size={20}
                    color="#5f259f"
                  />
                  <Text style={styles.categorySelectorText}>
                    {getCategoryName(editData.category_id)}
                  </Text>
                </View>
                {isEditing && (
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="contact-phone" size={24} color="#5f259f" />
              <Text style={styles.cardTitle}>Contact Information</Text>
            </View>

            <InputField
              label="Mobile Number"
              value={editData.mobile || ""}
              onChangeText={(text) =>
                setEditData(prev => ({ ...prev, mobile: text }))
              }
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
              icon={<Ionicons name="call-outline" size={20} color="#6B7280" />}
            />

            <InputField
              label="Email Address"
              value={editData.email || ""}
              onChangeText={(text) => 
                setEditData(prev => ({ ...prev, email: text }))
              }
              placeholder="Enter email address"
              keyboardType="email-address"
              icon={<MaterialIcons name="email" size={20} color="#6B7280" />}
            />
          </View>

          {/* Wallet Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons
                name="account-balance-wallet"
                size={24}
                color="#5f259f"
              />
              <Text style={styles.cardTitle}>Wallet Information</Text>
            </View>

            <View style={styles.walletContainer}>
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>Current Balance</Text>
                <Text style={styles.walletAmount}>
                  {formatCurrency(parseFloat(merchantData?.wallet || 0))}
                </Text>
              </View>
              <View style={styles.walletIcon}>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={32}
                  color="#00C851"
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          {isEditing && (
            <View style={styles.saveContainer}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (saving || !hasChanges()) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving || !hasChanges()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {hasChanges() ? "Save Changes" : "No Changes"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {hasChanges() && (
                <View style={styles.changesIndicator}>
                  <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                  <Text style={styles.changesText}>
                    You have unsaved changes
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CategoryModal />
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
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 12,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  inputWrapperFocused: {
    borderColor: "#5f259f",
    borderWidth: 2,
    shadowColor: "#5f259f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1F2937",
  },
  disabledInput: {
    backgroundColor: "#F9FAFB",
    color: "#6B7280",
  },
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  disabledSelector: {
    backgroundColor: "#F9FAFB",
  },
  categorySelectorContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  categorySelectorText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 12,
  },
  walletContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  walletAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00C851",
  },
  walletIcon: {
    marginLeft: 16,
  },
  saveContainer: {
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: "#5f259f",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5f259f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  changesIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  changesText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginLeft: 4,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalCloseButton: {
    padding: 4,
  },
  categoryList: {
    paddingHorizontal: 20,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryItemActive: {
    backgroundColor: "#5f259f",
    borderColor: "#5f259f",
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
    flex: 1,
  },
  categoryNameActive: {
    color: "#fff",
  },
  bottomPadding: {
    height: 20,
  },
});