// screens/AccountScreen.js
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const AccountScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state for editable fields
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  const fetchProfile = async () => {

     const customerId = await AsyncStorage.getItem('customer_id');
    try {
      setLoading(true);
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=get_customer_profile',
        { customer_id: customerId }
      );
      setProfile(response.data);
     
      // Update form state with fetched data
      setAccountNumber(response.data.account_number || '');
      setIfscCode(response.data.ifsc || '');
      setUpiId(response.data.upi || '');
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load profile data');
      setLoading(false);
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    // Validate inputs
    if (!accountNumber.trim()) {
      Alert.alert('Error', 'Account number cannot be empty');
      return;
    }
    
    if (!ifscCode.trim()) {
      Alert.alert('Error', 'IFSC code cannot be empty');
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=update_customer_profile',
        {
          id: profile.id,
          account_number: accountNumber,
          ifsc: ifscCode,
          upi: upiId
        }
      );
      
      setSaving(false);
      
      if (response.data.status === 'success') {
        // Update local profile data
        setProfile({
          ...profile,
          account_number: accountNumber,
          ifsc: ifscCode,
          upi: upiId
        });
        
        setIsEditMode(false);
        Alert.alert('Success', 'Account details updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update account details');
      }
    } catch (error) {
      setSaving(false);
      Alert.alert('Error', 'An error occurred while updating account details');
      console.error(error);
    }
  };

  const handleBack = () => {
   router.back();
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const toggleEditMode = () => {
    if (isEditMode) {
      // Cancel edit - reset form values to current profile
      setAccountNumber(profile?.account_number || '');
      setIfscCode(profile?.ifsc || '');
      setUpiId(profile?.upi || '');
    }
    setIsEditMode(!isEditMode);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6739B7" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[ 'left', 'right']}>
      <StatusBar backgroundColor="#6739B7" barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bank Account Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {profile?.name ? profile.name.charAt(0) : "U"}
              </Text>
            </View>
            <Text style={styles.nameText}>{profile?.name || "User"}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Account Details</Text>
              <TouchableOpacity 
                onPress={toggleEditMode}
                style={styles.editToggleButton}
              >
                <Ionicons 
                  name={isEditMode ? "close-outline" : "pencil-outline"} 
                  size={22} 
                  color="#6739B7" 
                />
              </TouchableOpacity>
            </View>
            
            {isEditMode ? (
              // Edit Mode Form
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name (Read Only)</Text>
                  <View style={styles.readonlyInputContainer}>
                    <Text style={styles.readonlyInput}>{profile?.name || 'User'}</Text>
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Enter your account number"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>IFSC Code</Text>
                  <TextInput
                    style={styles.input}
                    value={ifscCode}
                    onChangeText={setIfscCode}
                    placeholder="Enter IFSC code"
                    autoCapitalize="characters"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>UPI ID</Text>
                  <TextInput
                    style={styles.input}
                    value={upiId}
                    onChangeText={setUpiId}
                    placeholder="Enter UPI ID"
                    keyboardType="email-address"
                  />
                </View>
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={toggleEditMode}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleUpdate}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // View Mode
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Number</Text>
                  <Text style={styles.detailValue}>{profile?.account_number || "Not Set"}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>IFSC Code</Text>
                  <Text style={styles.detailValue}>{profile?.ifsc || "Not Set"}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UPI ID</Text>
                  <Text style={styles.detailValue}>{profile?.upi || "Not Set"}</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  // Custom header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6739B7',
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 24, // Same as the back button width for proper centering
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6739B7',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  profileHeader: {
    backgroundColor: '#6739B7',
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9776D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6739B7',
  },
  editToggleButton: {
    padding: 5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#555',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  // Edit mode styles
  formContainer: {
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  readonlyInputContainer: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
  },
  readonlyInput: {
    fontSize: 16,
    color: '#777',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#6739B7',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AccountScreen;