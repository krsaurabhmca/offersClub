import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const BusinessProfileScreen = () => {
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, []);

  const fetchProfile = async () => {
    const merchantId = await AsyncStorage.getItem("merchant_id");
    setIsLoading(true);
    try {
      const response = await fetch(
        "https://offersclub.offerplant.com/opex/api.php?task=get_merchant_profile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ merchant_id: merchantId }),
        }
      );
      const data = await response.json();
      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch profile");
    }
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        "https://offersclub.offerplant.com/opex/api.php?task=get_categories"
      );
      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch categories");
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setEditedProfile({
        ...editedProfile,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      });
      Alert.alert("Success", "Location updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to get current location");
    }
    setIsLoading(false);
  };

  const updateProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "https://offersclub.offerplant.com/opex/api.php?task=update_merchant_profile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editedProfile),
        }
      );

      if (response.ok) {
        setProfile(editedProfile);
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully");
      } else {
        Alert.alert("Error", "Failed to update profile");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    }
    setIsLoading(false);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Select Category";
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.icon : "business-outline";
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => {
        setEditedProfile({ ...editedProfile, category_id: item.id });
        setShowCategoryModal(false);
      }}
    >
      <Ionicons name={item.icon} size={24} color="#5f4fcf" />
      <Text style={styles.categoryItemText}>{item.name}</Text>
      {editedProfile.category_id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#5f4fcf" />
      )}
    </TouchableOpacity>
  );

  if (isLoading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5f4fcf" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5f4fcf" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Profile</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Ionicons
            name={isEditing ? "close" : "create-outline"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="business" size={32} color="#5f4fcf" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.businessName}>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedProfile.business_name}
                    onChangeText={(text) =>
                      setEditedProfile({
                        ...editedProfile,
                        business_name: text,
                      })
                    }
                    placeholder="Business Name"
                  />
                ) : (
                  profile?.business_name
                )}
              </Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        profile?.status === "ACTIVE" ? "#4caf50" : "#f44336",
                    },
                  ]}
                />
                <Text style={styles.statusText}>{profile?.status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Business Details</Text>

          {/* Contact Person */}
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Contact Person</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedProfile.contact_person}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, contact_person: text })
                  }
                  placeholder="Contact Person"
                />
              ) : (
                <Text style={styles.detailValue}>
                  {profile?.contact_person}
                </Text>
              )}
            </View>
          </View>

          {/* Mobile */}
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Mobile</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedProfile.mobile}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, mobile: text })
                  }
                  placeholder="Mobile Number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.detailValue}>{profile?.mobile}</Text>
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.detailItem}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedProfile.email}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, email: text })
                  }
                  placeholder="Email Address"
                  keyboardType="email-address"
                />
              ) : (
                <Text style={styles.detailValue}>{profile?.email}</Text>
              )}
            </View>
          </View>

          {/* Category */}
          {isEditing ? (
            <TouchableOpacity
              style={styles.detailItem}
              onPress={() => setShowCategoryModal(true)}
            >
              <Ionicons
                name={getCategoryIcon(editedProfile?.category_id)}
                size={20}
                color="#666"
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>
                  {getCategoryName(editedProfile?.category_id)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <View style={styles.detailItem}>
              <Ionicons
                name={getCategoryIcon(profile?.category_id)}
                size={20}
                color="#666"
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>
                  {getCategoryName(profile?.category_id)}
                </Text>
              </View>
            </View>
          )}

          {/* Location */}
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {profile?.latitude}, {profile?.longitude}
              </Text>
            </View>
            {isEditing && (
              <TouchableOpacity
                onPress={getCurrentLocation}
                style={styles.locationButton}
              >
                <Ionicons name="navigate" size={20} color="#5f4fcf" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setEditedProfile(profile);
                setIsEditing(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={updateProfile}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            { backgroundColor: "#e51f78ff", marginBottom: 30 },
          ]}
          onPress={() => router.push("/updateQr")}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Change QR Code</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#5f4fcf",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: "#666",
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  editInput: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    borderBottomWidth: 1,
    borderBottomColor: "#5f4fcf",
    paddingVertical: 4,
  },
  locationButton: {
    padding: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveButton: {
    backgroundColor: "#5f4fcf",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryItemText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
});

export default BusinessProfileScreen;
