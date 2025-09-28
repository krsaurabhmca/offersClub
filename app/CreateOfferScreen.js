import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const CreateOfferScreen = () => {
  // Check if we're in edit mode
  const params = useLocalSearchParams();
  const offer_id = params.offer_id ? String(params.offer_id) : null;
  const isEditMode = params.isEditMode === "true"; // convert string to boolean
  
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    scope_type: 'NEW',
    min_amount: '',
    max_cashback: '',
    per_user_limit: '',
    merchant_id: '', // Will be loaded from AsyncStorage
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [loadingMerchant, setLoadingMerchant] = useState(true);
  const [useAdvancedOptions, setUseAdvancedOptions] = useState(false);

  const customerTypes = [
    { value: 'NEW', label: 'NEW', fullLabel: 'New Customers' },
    { value: 'OLD', label: 'OLD', fullLabel: 'Existing Customers' },
    { value: 'BOTH', label: 'ALL', fullLabel: 'All Customers' },
  ];

  // AsyncStorage keys
  const STORAGE_KEYS = {
    MERCHANT_ID: 'merchant_id',
    USER_DATA: 'user_data',
    FORM_DRAFT: 'offer_form_draft',
  };

  // Load merchant data from AsyncStorage
  useEffect(() => {
    loadMerchantData();
  }, []);

  // Load data from route params if in edit mode
  useEffect(() => {
    if (isEditMode && params) {
      loadDataFromParams();
    }
  }, [isEditMode, params]);

  // Load offer data from API if in edit mode and merchant_id is available
  useEffect(() => {
    if (isEditMode && offer_id && formData.merchant_id && !loadingMerchant) {
      loadOfferDataFromAPI();
    }
  }, [isEditMode, offer_id, formData.merchant_id, loadingMerchant]);

  // Auto-save form data as draft (only in create mode)
  useEffect(() => {
    if (!isEditMode && formData.merchant_id && !loadingMerchant) {
      const timeoutId = setTimeout(() => {
        saveDraftData();
      }, 1000); // Debounce auto-save

      return () => clearTimeout(timeoutId);
    }
  }, [formData, isEditMode, loadingMerchant]);

  const loadMerchantData = async () => {
    try {
      setLoadingMerchant(true);
      
      // Try to get merchant_id from AsyncStorage
      const storedMerchantId = await AsyncStorage.getItem(STORAGE_KEYS.MERCHANT_ID);
      
      if (storedMerchantId) {
        setFormData(prev => ({
          ...prev,
          merchant_id: storedMerchantId
        }));
        
        // Load draft data if not in edit mode
        if (!isEditMode) {
          await loadDraftData();
        }
      } else {
        // If no merchant_id found, set default and save it
        const defaultMerchantId = '103';
        await AsyncStorage.setItem(STORAGE_KEYS.MERCHANT_ID, defaultMerchantId);
        setFormData(prev => ({
          ...prev,
          merchant_id: defaultMerchantId
        }));
        
        Alert.alert(
          'Setup Complete',
          'Default Merchant ID (103) has been set. You can update this in settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error loading merchant data:', error);
      // Fallback to default
      setFormData(prev => ({
        ...prev,
        merchant_id: '103'
      }));
    } finally {
      setLoadingMerchant(false);
    }
  };

  const loadDataFromParams = () => {
    // Load data from route params for immediate display in edit mode
    if (params) {
      const newFormData = {
        start_date: params.start_date === '0000-00-00' ? '' : (params.start_date || ''),
        end_date: params.end_date || '',
        scope_type: params.scope_type || 'NEW',
        min_amount: params.min_amount?.toString() || '',
        max_cashback: params.max_cashback?.toString() || '',
        per_user_limit: params.per_user_limit?.toString() || '',
        merchant_id: params.merchant_id?.toString() || formData.merchant_id,
      };

      setFormData(prev => ({
        ...prev,
        ...newFormData
      }));

      // Enable advanced options if needed
      if ((params.start_date && params.start_date !== '0000-00-00') || 
          params.end_date || 
          params.per_user_limit) {
        setUseAdvancedOptions(true);
      }
    }
  };

  const loadDraftData = async () => {
    try {
      const draftData = await AsyncStorage.getItem(STORAGE_KEYS.FORM_DRAFT);
      if (draftData) {
        const parsedDraft = JSON.parse(draftData);
        
        // Check if draft has meaningful data
        const hasMeaningfulData = parsedDraft.min_amount || 
                                 parsedDraft.max_cashback || 
                                 parsedDraft.scope_type !== 'NEW';
        
        if (hasMeaningfulData) {
          // Ask user if they want to restore draft
          Alert.alert(
            'Draft Found',
            'You have unsaved changes. Would you like to restore them?',
            [
              {
                text: 'No',
                style: 'cancel',
                onPress: () => clearDraftData()
              },
              {
                text: 'Yes',
                onPress: () => {
                  setFormData(prev => ({
                    ...prev,
                    ...parsedDraft,
                    merchant_id: prev.merchant_id // Keep current merchant_id
                  }));
                  
                  // Enable advanced options if draft has advanced fields
                  if (parsedDraft.start_date || parsedDraft.end_date || parsedDraft.per_user_limit) {
                    setUseAdvancedOptions(true);
                  }
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
    }
  };

  const saveDraftData = async () => {
    try {
      // Only save if there's meaningful data
      if (formData.min_amount || formData.max_cashback || formData.scope_type !== 'NEW') {
        const draftData = {
          start_date: formData.start_date,
          end_date: formData.end_date,
          scope_type: formData.scope_type,
          min_amount: formData.min_amount,
          max_cashback: formData.max_cashback,
          per_user_limit: formData.per_user_limit,
        };
        await AsyncStorage.setItem(STORAGE_KEYS.FORM_DRAFT, JSON.stringify(draftData));
      }
    } catch (error) {
      console.error('Error saving draft data:', error);
    }
  };

  const clearDraftData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.FORM_DRAFT);
    } catch (error) {
      console.error('Error clearing draft data:', error);
    }
  };

  const loadOfferDataFromAPI = async () => {
    setLoadingOffer(true);
    try {
      const response = await axios.get(
        `https://offersclub.offerplant.com/opex/api.php?task=get_offer&offer_id=${offer_id}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Offer data response:', response.data);
      if (response.data.status === 'success' && response.data.data) {
        const offerData = response.data.data;
        setFormData(prev => ({
          start_date: offerData.start_date === '0000-00-00' ? '' : offerData.start_date || '',
          end_date: offerData.end_date || '',
          scope_type: offerData.scope_type || 'NEW',
          min_amount: offerData.min_amount?.toString() || '',
          max_cashback: offerData.max_cashback?.toString() || '',
          per_user_limit: offerData.per_user_limit?.toString() || '',
          merchant_id: prev.merchant_id, // Keep the loaded merchant_id
        }));

        // Enable advanced options if any advanced fields have values
        if ((offerData.start_date && offerData.start_date !== '0000-00-00') || 
            offerData.end_date || 
            offerData.per_user_limit) {
          setUseAdvancedOptions(true);
        }
      } else {
        Alert.alert('Error', 'Failed to load offer data from server');
      }
    } catch (error) {
      console.error('Error loading offer from API:', error);
      // Don't show error if we already have data from params
      if (!formData.min_amount && !formData.max_cashback) {
        Alert.alert('Warning', 'Could not load latest offer data from server. Using cached data.');
      }
    } finally {
      setLoadingOffer(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.merchant_id) {
      Alert.alert('Error', 'Merchant ID is required');
      return false;
    }
    if (!formData.min_amount || !formData.max_cashback) {
      Alert.alert('Error', 'Please fill in minimum amount and maximum cashback');
      return false;
    }
    if (parseInt(formData.min_amount) <= 0) {
      Alert.alert('Error', 'Minimum amount must be greater than 0');
      return false;
    }
    if (parseInt(formData.max_cashback) <= 0) {
      Alert.alert('Error', 'Maximum cashback must be greater than 0');
      return false;
    }
    if (useAdvancedOptions && formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        Alert.alert('Error', 'End date must be after start date');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare request data
      const requestData = {
        scope_type: formData.scope_type,
        min_amount: parseInt(formData.min_amount),
        max_cashback: parseInt(formData.max_cashback),
        merchant_id: parseInt(formData.merchant_id),
      };

      // Add offer_id for edit mode 
      if (isEditMode) {
        requestData.offer_id = parseInt(offer_id);
      }

      // Add optional fields if advanced options are enabled
      if (useAdvancedOptions) {
        if (formData.start_date) requestData.start_date = formData.start_date;
        if (formData.end_date) requestData.end_date = formData.end_date;
        if (formData.per_user_limit) requestData.per_user_limit = parseInt(formData.per_user_limit);
      }

      // Determine API endpoint and task
      const task = isEditMode ? 'update_offer' : 'create_offer';
      
      const response = await axios.post(
        `https://offersclub.offerplant.com/opex/api.php?task=${task}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status === 'success') {
        // Clear draft data on successful submission
        if (!isEditMode) {
          await clearDraftData();
        }

        Alert.alert(
          'Success', 
          response.data.msg || `Offer ${isEditMode ? 'updated' : 'created'} successfully`, 
          [
            {
              text: 'OK',
              onPress: () => {
                if (isEditMode) {
                  router.back();
                } else {
                  // Reset form for create mode
                  setFormData({
                    start_date: '',
                    end_date: '',
                    scope_type: 'NEW',
                    min_amount: '',
                    max_cashback: '',
                    per_user_limit: '',
                    merchant_id: formData.merchant_id, // Keep merchant_id
                  });
                  setUseAdvancedOptions(false);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data.msg || `Failed to ${isEditMode ? 'update' : 'create'} offer`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} offer:`, error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (!isEditMode && (formData.min_amount || formData.max_cashback)) {
      Alert.alert(
        'Save Draft',
        'Do you want to save your changes as draft?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await clearDraftData();
              router.back();
            }
          },
          {
            text: 'Save Draft',
            onPress: async () => {
              await saveDraftData();
              router.back();
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  if (loadingMerchant || (isEditMode && loadingOffer)) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Ionicons name="gift-outline" size={24} color="white" />
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#5f27cd" />
          <Text style={styles.loadingText}>
            {loadingMerchant ? 'Loading merchant data...' : 'Loading offer data...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Ionicons name="gift-outline" size={24} color="white" />
          <Text style={styles.headerTitle}>
            {isEditMode ? `Edit Offer #${offer_id}` : 'Create Offer'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Form Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={20} color="#5f27cd" />
            <Text style={styles.cardTitle}>Offer Details</Text>
            {isEditMode && (
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>EDIT MODE</Text>
              </View>
            )}
          </View>

          {/* Merchant ID Display (Read-only) */}
          {/* <View style={styles.inputGroup}>
            <Text style={styles.label}>Merchant ID</Text>
            <View style={[styles.inputContainer, styles.readOnlyContainer]}>
              <Ionicons name="business-outline" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.readOnlyText}>{formData.merchant_id}</Text>
            </View>
          </View> */}

          {/* Scope Type - Horizontal Layout */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer Type</Text>
            <View style={styles.radioGroupHorizontal}>
              {customerTypes.map((type, index) => (
                <React.Fragment key={type.value}>
                  <TouchableOpacity
                    style={[
                      styles.radioButtonHorizontal,
                      formData.scope_type === type.value && styles.radioButtonSelected,
                    ]}
                    onPress={() => handleInputChange('scope_type', type.value)}
                  >
                    <Text
                      style={[
                        styles.radioTextHorizontal,
                        formData.scope_type === type.value && styles.radioTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                  {index < customerTypes.length - 1 && (
                    <View style={styles.separator}>
                      <Text style={styles.separatorText}>|</Text>
                    </View>
                  )}
                </React.Fragment>
              ))}
            </View>
            
            {/* Show full description for selected type */}
            <Text style={styles.selectedTypeDescription}>
              {customerTypes.find(type => type.value === formData.scope_type)?.fullLabel}
            </Text>
          </View>

          {/* Min Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Minimum Amount (₹)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="cash-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.min_amount}
                onChangeText={(value) => handleInputChange('min_amount', value)}
                placeholder="Enter minimum amount"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Max Cashback */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Maximum Cashback (₹)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="wallet-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.max_cashback}
                onChangeText={(value) => handleInputChange('max_cashback', value)}
                placeholder="Enter maximum cashback"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Advanced Options Toggle */}
          <View style={styles.advancedToggle}>
            <View style={styles.toggleContent}>
              <Ionicons name="settings-outline" size={20} color="#5f27cd" />
              <Text style={styles.toggleLabel}>Advanced Options</Text>
            </View>
            <Switch
              value={useAdvancedOptions}
              onValueChange={setUseAdvancedOptions}
              trackColor={{ false: '#d1d5db', true: '#a855f7' }}
              thumbColor={useAdvancedOptions ? '#5f27cd' : '#9ca3af'}
            />
          </View>

          {/* Advanced Options */}
          {useAdvancedOptions && (
            <View style={styles.advancedSection}>
              {/* Start Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.start_date}
                    onChangeText={(value) => handleInputChange('start_date', value)}
                    placeholder="2025-10-05"
                  />
                </View>
              </View>

              {/* End Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.end_date}
                    onChangeText={(value) => handleInputChange('end_date', value)}
                    placeholder="2025-11-05"
                  />
                </View>
              </View>

              {/* Per User Limit */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Per User Limit</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.per_user_limit}
                    onChangeText={(value) => handleInputChange('per_user_limit', value)}
                    placeholder="5"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <View style={styles.buttonContent}>
            {loading ? (
              <Ionicons name="hourglass-outline" size={20} color="white" />
            ) : (
              <Ionicons 
                name={isEditMode ? "checkmark-circle-outline" : "add-circle-outline"} 
                size={20} 
                color="white" 
              />
            )}
            <Text style={styles.createButtonText}>
              {loading 
                ? `${isEditMode ? 'Updating' : 'Creating'} Offer...` 
                : `${isEditMode ? 'Update' : 'Create'} Offer`
              }
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#5f27cd',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  editBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  readOnlyContainer: {
    backgroundColor: '#f3f4f6',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1f2937',
  },
  readOnlyText: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#6b7280',
    textAlignVertical: 'center',
    fontWeight: '500',
  },
  // Horizontal radio button styles
  radioGroupHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  radioButtonHorizontal: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#5f27cd',
  },
  radioTextHorizontal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  radioTextSelected: {
    color: 'white',
  },
  separator: {
    paddingHorizontal: 8,
  },
  separatorText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '300',
  },
  selectedTypeDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  advancedSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
    marginTop: 16,
  },
  createButton: {
    backgroundColor: '#5f27cd',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CreateOfferScreen;