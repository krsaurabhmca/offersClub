import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const MyOffersScreen = ({ onBack, onEditOffer }) => {
  const { merchant_id: routeMerchantId } = useLocalSearchParams(); // ✅ from route
 
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [count, setCount] = useState(0);

 
const fetchOffers = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      let id = routeMerchantId; // ✅ Try from route first

      // If not in route → fallback to AsyncStorage
      if (!id) {
        id = await AsyncStorage.getItem("merchant_id");
      }

      if (!id) {
        Alert.alert("Error", "Merchant ID not found");
        return;
      }

      const response = await axios.post(
        "https://offersclub.offerplant.com/opex/api.php?task=merchant_offers",
        { merchant_id: id },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.status === "success") {
        setOffers(response.data.data || []);
        setCount(response.data.count || 0);
      } else {
       // Alert.alert("Error", "Failed to fetch offers");
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers(true);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString || dateString === '0000-00-00' || dateString === null) {
      return 'No limit';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return '#10b981';
      case 'INACTIVE':
        return '#ef4444';
      case 'EXPIRED':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getScopeTypeLabel = (scopeType) => {
    switch (scopeType) {
      case 'NEW':
        return 'New Customers';
      case 'OLD':
        return 'Existing Customers';
      case 'BOTH':
        return 'All Customers';
      default:
        return 'All Customers';
    }
  };

  const handleEditOffer = (offer) => {
   router.push({
      pathname: '/EditOfferScreen',
      params: {offerId:offer.id},
    });
  };

  const handleDeleteOffer = (offerId) => {
    Alert.alert(
      'Delete Offer',
      'Are you sure you want to delete this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implement delete functionality here
            console.log('Delete offer:', offerId);
          },
        },
      ]
    );
  };

  const renderOfferCard = (offer, index) => (
    <View key={offer.id} style={styles.offerCard}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.offerIdContainer}>
          <Ionicons name="pricetag-outline" size={16} color="#5f27cd" />
          <Text style={styles.offerId}>#{offer.id}</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(offer.status) }]}>
            <Text style={styles.statusText}>{offer.status}</Text>
          </View>
          {/* <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditOffer(offer)}
          >
            <Ionicons name="create-outline" size={18} color="#5f27cd" />
          </TouchableOpacity> */}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteOffer(offer.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cashback Details */}
      <View style={styles.cashbackSection}>
        <View style={styles.cashbackHeader}>
          <Ionicons name="wallet-outline" size={20} color="#5f27cd" />
          <Text style={styles.sectionTitle}>Offer Details</Text>
        </View>
        <View style={styles.cashbackRow}>
          <View style={styles.cashbackItem}>
            <Text style={styles.cashbackLabel}>Min Amount</Text>
            <Text style={styles.cashbackValue}>₹{parseFloat(offer.min_amount).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.cashbackItem}>
            <Text style={styles.cashbackLabel}>Max Cashback</Text>
            <Text style={styles.cashbackValue}>₹{parseFloat(offer.max_cashback).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.cashbackItem}>
            <Text style={styles.cashbackLabel}>Customer Type</Text>
            <Text style={styles.cashbackValue}>{getScopeTypeLabel(offer.scope_type)}</Text>
          </View>
        </View>
      </View>

      {/* Date Range */}
      <View style={styles.dateSection}>
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <View>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>{formatDate(offer.start_date)}</Text>
            </View>
          </View>
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <View>
              <Text style={styles.dateLabel}>End Date</Text>
              <Text style={styles.dateValue}>{formatDate(offer.end_date)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Offer Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryText}>
          Get up to ₹{parseFloat(offer.max_cashback).toLocaleString('en-IN')} cashback on minimum purchase of ₹{parseFloat(offer.min_amount).toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );

  const  myBack = () => (
    router.back()
  );
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="gift-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyStateTitle}>No Offers Found</Text>
      <Text style={styles.emptyStateText}>
        You haven not created any offers yet. Create your first offer to get started!
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={() => fetchOffers()}>
        <Ionicons name="refresh-outline" size={20} color="#5f27cd" />
        <Text style={styles.emptyStateButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#5f27cd" />
      <Text style={styles.loadingText}>Loading your offers...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
    <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={myBack}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Active Offers</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
        {count > 0 && (
          <Text style={styles.headerSubtitle}>
            {count} offer{count !== 1 ? 's' : ''} found
          </Text>
        )}
      </View>

      {/* Content */}
      {loading ? (
        renderLoadingState()
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#5f27cd']}
              tintColor="#5f27cd"
            />
          }
        >
          {offers.length === 0 ? renderEmptyState() : offers.map(renderOfferCard)}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5f27cd',
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
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
  offerIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  cashbackSection: {
    marginBottom: 16,
  },
  cashbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  cashbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cashbackItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 2,
  },
  cashbackLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  cashbackValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  dateSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 8,
  },
  summarySection: {
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5f27cd',
  },
  summaryText: {
    fontSize: 14,
    color: '#5f27cd',
    fontWeight: '500',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5f27cd',
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5f27cd',
    marginLeft: 8,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});

export default MyOffersScreen;