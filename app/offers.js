import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function OffersScreen() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    fetchOffers();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      setIsLoggedIn(!!customerId);
    } catch (error) {
      setIsLoggedIn(false);
    }
  };

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'https://offersclub.offerplant.com/opex/api.php?task=active_offers'
      );
      if (response.data.status === 'success') {
        const sortedOffers = response.data.data.sort((a, b) => parseInt(b.priority) - parseInt(a.priority));
        setOffers(sortedOffers);
      } else {
        Alert.alert('Error', 'Failed to load offers');
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOffers();
    setRefreshing(false);
  }, []);

  const getFilteredOffers = () => {
    if (selectedFilter === 'ALL') {
      return offers;
    }
    return offers.filter(offer => offer.scope_type === selectedFilter);
  };

  const getScopeDisplayText = (scopeType, scopeValue) => {
    switch (scopeType) {
      case 'ALL_USERS':
        return 'All Users';
      case 'NEW_USERS':
        return 'New Users Only';
      case 'MERCHANT_ONLY':
        return `Merchant ID: ${scopeValue}`;
      case 'WALLET_ONLY':
        return scopeValue === 'APP_WALLET' ? 'App Wallet Only' : 'Wallet Only';
      default:
        return scopeType;
    }
  };

  const getCashbackDisplayText = (cashbackType, cashbackValue, maxCashback) => {
    if (cashbackType === 'FLAT') {
      return `₹${parseFloat(cashbackValue).toFixed(0)}`;
    } else {
      return `${parseFloat(cashbackValue)}%`;
    }
  };

  const getOfferGradient = (scopeType, priority) => {
    if (parseInt(priority) >= 10) {
      return ['#5F259F', '#8940FF']; // High priority PhonePe Purple
    }
    switch (scopeType) {
      case 'NEW_USERS':
        return ['#5F259F', '#713EBE']; // PhonePe Purple
      case 'MERCHANT_ONLY':
        return ['#713EBE', '#8940FF']; // PhonePe Purple variation
      case 'WALLET_ONLY':
        return ['#4F29B1', '#673AB7']; // Deep Purple
      default:
        return ['#5F259F', '#713EBE']; // Default PhonePe Purple
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const OfferCard = ({ offer }) => {
    const daysRemaining = getDaysRemaining(offer.end_date);
    const isExpiringSoon = daysRemaining <= 3;
    
    return (
      <TouchableOpacity style={styles.offerCard} activeOpacity={0.9}>
        <LinearGradient
          colors={getOfferGradient(offer.scope_type, offer.priority)}
          style={styles.offerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Priority Badge */}
          {parseInt(offer.priority) >= 10 && (
            <View style={styles.priorityBadge}>
              <MaterialIcons name="local-fire-department" size={14} color="#5F259F" />
              <Text style={styles.priorityText}>HOT</Text>
            </View>
          )}

          {/* Expiry Warning */}
          {isExpiringSoon && daysRemaining > 0 && (
            <View style={styles.expiryWarning}>
              <Ionicons name="time-outline" size={14} color="#f44336" style={styles.expiryIcon} />
              <Text style={styles.expiryText}>{daysRemaining} days left!</Text>
            </View>
          )}

          <View style={styles.offerContent}>
            {/* Cashback Value */}
            <View style={styles.cashbackContainer}>
              <Text style={styles.cashbackValue}>
                {getCashbackDisplayText(offer.cashback_type, offer.cashback_value, offer.max_cashback)}
              </Text>
              <Text style={styles.cashbackLabel}>
                {offer.cashback_type === 'FLAT' ? 'Flat Cashback' : 'Cashback'}
              </Text>
            </View>

            {/* Offer Details */}
            <View style={styles.offerDetails}>
              <View style={styles.detailRow}>
                <MaterialIcons name="account-balance-wallet" size={18} color="#fff" style={styles.detailIcon} />
                <Text style={styles.detailText}>
                  Min Amount: ₹{parseFloat(offer.min_amount).toFixed(0)}
                </Text>
              </View>

              {offer.cashback_type === 'PERCENT' && (
                <View style={styles.detailRow}>
                  <FontAwesome5 name="bullseye" size={16} color="#fff" style={styles.detailIcon} />
                  <Text style={styles.detailText}>
                    Max Cashback: ₹{parseFloat(offer.max_cashback).toFixed(0)}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Ionicons name="people" size={18} color="#fff" style={styles.detailIcon} />
                <Text style={styles.detailText}>
                  {getScopeDisplayText(offer.scope_type, offer.scope_value)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="date-range" size={18} color="#fff" style={styles.detailIcon} />
                <Text style={styles.detailText}>
                  Valid till {formatDate(offer.end_date)}
                </Text>
              </View>
            </View>

            {/* Usage Limits */}
            <View style={styles.limitsContainer}>
              {parseInt(offer.per_user_limit) > 0 && (
                <View style={styles.limitBadge}>
                  <MaterialIcons name="person" size={14} color="#fff" style={styles.limitIcon} />
                  <Text style={styles.limitText}>
                    {offer.per_user_limit} per user
                  </Text>
                </View>
              )}
              
              {parseInt(offer.global_limit) > 0 && (
                <View style={styles.limitBadge}>
                  <MaterialIcons name="timer" size={14} color="#fff" style={styles.limitIcon} />
                  <Text style={styles.limitText}>
                    {parseInt(offer.global_limit) - parseInt(offer.redeemed_count)} left
                  </Text>
                </View>
              )}
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.useOfferButton}
              onPress={() => {
                if (!isLoggedIn) {
                  Alert.alert(
                    'Login Required',
                    'Please login to use this offer.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Login', onPress: () => router.push('/') }
                    ]
                  );
                } else {
                  router.push('/qr-scanner');
                }
              }}
            >
              <Text style={styles.useOfferButtonText}>
                {isLoggedIn ? 'Use This Offer' : 'Login to Use'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#5F259F" style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ label, value, active }) => (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="gift-outline" size={64} color="#fff" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Offers Available</Text>
      <Text style={styles.emptySubtitle}>
        Check back later for amazing deals and cashback offers!
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={['#5F259F', '#713EBE']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Special Offers</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Offers Count */}
      <View style={styles.countContainer}>
        <MaterialIcons name="celebration" size={20} color="#fff" style={styles.countIcon} />
        <Text style={styles.countText}>
          {getFilteredOffers().length} Active Offers
        </Text>
      </View>

      {/* Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <FilterButton label="All" value="ALL" active={selectedFilter === 'ALL'} />
        <FilterButton label="For Everyone" value="ALL_USERS" active={selectedFilter === 'ALL_USERS'} />
        <FilterButton label="New Users" value="NEW_USERS" active={selectedFilter === 'NEW_USERS'} />
        <FilterButton label="Merchant Specific" value="MERCHANT_ONLY" active={selectedFilter === 'MERCHANT_ONLY'} />
        <FilterButton label="Wallet Only" value="WALLET_ONLY" active={selectedFilter === 'WALLET_ONLY'} />
      </ScrollView>

      {/* Offers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading amazing offers...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.offersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#5F259F']}
              tintColor="#fff"
            />
          }
        >
          {getFilteredOffers().length > 0 ? (
            getFilteredOffers().map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))
          ) : (
            <EmptyState />
          )}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  countIcon: {
    marginRight: 6,
  },
  countText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    marginBottom: 20,
    maxHeight: 40,
  },
  filterContent: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#5F259F',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#5F259F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
  },
  offersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  offerCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  offerGradient: {
    padding: 20,
    position: 'relative',
  },
  priorityBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5F259F',
    marginLeft: 4,
  },
  expiryWarning: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryIcon: {
    marginRight: 4,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f44336',
  },
  offerContent: {
    marginTop: 10,
  },
  cashbackContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cashbackValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontFamily: 'System',
  },
  cashbackLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    opacity: 0.9,
  },
  offerDetails: {
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 10,
    width: 22,
    textAlign: 'center',
  },
  detailText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  limitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  limitBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitIcon: {
    marginRight: 4,
  },
  limitText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  useOfferButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  useOfferButtonText: {
    color: '#5F259F',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginTop: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#f0f0f0',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 30,
  },
  bottomPadding: {
    height: 30,
  },
});