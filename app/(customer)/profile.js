import {
  Feather,
  Ionicons,
  MaterialIcons
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal, // Added Modal import
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// DeleteConfirmationModal Component (moved outside the main component)
const DeleteConfirmationModal = ({ visible, onClose, onConfirm, isLoading }) => {
  const [confirmText, setConfirmText] = useState('');
  const confirmationKeyword = "DELETE";
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="warning" size={28} color="#FF3B30" />
            <Text style={styles.modalTitle}>Delete Account</Text>
          </View>
          
          <Text style={styles.modalText}>
            You are about to delete your profile information. This action cannot be undone.
          </Text>
          
          <View style={styles.riskContainer}>
            <Text style={styles.riskTitle}>You understand that:</Text>
            <View style={styles.riskItem}>
              <Ionicons name="remove-circle" size={16} color="#FF3B30" />
              <Text style={styles.riskText}>Your bank account details will be removed</Text>
            </View>
            <View style={styles.riskItem}>
              <Ionicons name="remove-circle" size={16} color="#FF3B30" />
              <Text style={styles.riskText}>Payment services may be disrupted</Text>
            </View>
            <View style={styles.riskItem}>
              <Ionicons name="remove-circle" size={16} color="#FF3B30" />
              <Text style={styles.riskText}>This action cannot be reversed</Text>
            </View>
          </View>
          
          <Text style={styles.confirmInstructionText}>
            Type "{confirmationKeyword}" to confirm deletion:
          </Text>
          
          <TextInput
            style={styles.confirmInput}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={`Type ${confirmationKeyword} here`}
          />
          
          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.deleteModalButton,
                (confirmText !== confirmationKeyword) && styles.deleteModalButtonDisabled
              ]}
              onPress={onConfirm}
              disabled={confirmText !== confirmationKeyword || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.deleteModalButtonText}>Delete My Data</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        router.replace('/');
        return;
      }

      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=get_customer_profile',
        { customer_id: parseInt(customerId) }
      );

      if (response.data && response.data.id) {
        setUserProfile(response.data);
        setName(response.data.name || '');
        setEmail(response.data.email || '');
        setAddress(response.data.address || '');
        
        // Update AsyncStorage
        await AsyncStorage.setItem('user_name', response.data.name || '');
        await AsyncStorage.setItem('user_email', response.data.email || '');
        await AsyncStorage.setItem('user_address', response.data.address || '');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  }, []);

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=update_customer_profile',
        {
          id: await AsyncStorage.getItem('customer_id'),
          name: name.trim(),
          email: email.trim(),
          address: address?.trim() || "",
        }
      );

      if (response.data?.status === "success") {
        // Save locally only after API success
        await AsyncStorage.setItem('user_name', name.trim());
        await AsyncStorage.setItem('user_email', email.trim());
        await AsyncStorage.setItem('user_address', address?.trim() || "");

        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleDeleteProfile = async () => {
    try {
      setDeleting(true);
      
      // Get customer_id from AsyncStorage
      const customerId = await AsyncStorage.getItem('customer_id');
      
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=delete_customer_profile',
        { customer_id: customerId }
      );
      
      setDeleting(false);
      setDeleteModalVisible(false);
      
      if (response.data && response.data.status === 'success') {
        // Clear AsyncStorage
        await AsyncStorage.clear();
        
        Alert.alert(
          'Profile Deleted',
          'Your profile has been successfully deleted.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate to sign-in screen
                router.replace('/');
              } 
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to delete profile. Please try again later.');
      }
    } catch (error) {
      setDeleting(false);
      setDeleteModalVisible(false);
      Alert.alert('Error', 'An error occurred while deleting profile');
      console.error(error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return '#00C851';
      case 'INACTIVE': return '#ff4757';
      case 'PENDING': return '#FF8800';
      default: return '#00C851';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
        <ActivityIndicator size="large" color="#5f259f" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => setIsEditing(!isEditing)}
        >
          <Feather name={isEditing ? "x" : "edit-2"} size={20} color="#fff" />
        </TouchableOpacity>
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
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(userProfile.name)}
              </Text>
            </View>
            <View style={[styles.statusIndicator, { 
              backgroundColor: getStatusColor(userProfile.status) 
            }]} />
          </View>
          
          <Text style={styles.userName}>{userProfile.name || 'User'}</Text>
          <Text style={styles.userPhone}>{userProfile.mobile}</Text>
          
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{parseFloat(userProfile.wallet || 0).toFixed(2)}</Text>
              <Text style={styles.statLabel}>Wallet Balance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userProfile.status || 'ACTIVE'}</Text>
              <Text style={styles.statLabel}>Account Status</Text>
            </View>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar-outline" size={18} color="#5f259f" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>{formatDate(userProfile.created_at)}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <MaterialIcons name="update" size={18} color="#5f259f" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>{formatDate(userProfile.updated_at)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Personal Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="phone-portrait-outline" size={18} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={userProfile.mobile}
                editable={false}
              />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#00C851" />
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                editable={isEditing}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                editable={isEditing}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={18} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !isEditing && styles.disabledInput]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                editable={isEditing}
                multiline
              />
            </View>
          </View>

          {isEditing && (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Settings Menu */}
        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.settingsItem} onPress={() => router.push('/AccountScreen')}>
            <View style={styles.settingsIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#5f259f" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Bank Details</Text>
              <Text style={styles.settingsSubtitle}>Add or update bank details</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsIcon}>
              <Ionicons name="notifications-outline" size={20} color="#5f259f" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Notifications</Text>
              <Text style={styles.settingsSubtitle}>Manage notification preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsIcon}>
              <Ionicons name="help-circle-outline" size={20} color="#5f259f" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Help & Support</Text>
              <Text style={styles.settingsSubtitle}>Get help or contact support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsIcon}>
              <Ionicons name="document-text-outline" size={20} color="#5f259f" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Terms & Privacy</Text>
              <Text style={styles.settingsSubtitle}>View terms and privacy policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Delete Account Button */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={styles.deleteButtonText}>Delete My Profile</Text>
          </TouchableOpacity>
          <Text style={styles.dangerZoneDescription}>
            This will permanently delete your all account information from our system.
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#ff4757" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Add the Delete Confirmation Modal */}
      <DeleteConfirmationModal 
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteProfile}
        isLoading={deleting}
      />
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  editButton: {
    padding: 8,
    paddingRight:20,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,

  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5f259f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5f259f',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#ecf0f1',
    marginHorizontal: 20,
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  disabledInput: {
    backgroundColor: '#f8f9fa',
    color: '#7f8c8d',
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  buttonGroup: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#5f259f',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  logoutButton: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff4757',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
  // Danger zone styles
  dangerZone: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFDDDD',
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  dangerZoneDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginLeft: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 22,
  },
  riskContainer: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  confirmInstructionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  confirmInput: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelModalButton: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButtonText: {
    color: '#444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteModalButton: {
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalButtonDisabled: {
    backgroundColor: '#FFACA7',
  },
  deleteModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});