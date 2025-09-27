import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function NearbyMerchantsScreen() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [radius, setRadius] = useState(10000); // Default 10km
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    requestLocationPermission();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      setIsLoggedIn(!!customerId);
    } catch (error) {
      setIsLoggedIn(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      
      // Request permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to find nearby merchants.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Manual Entry', onPress: showManualLocationInput }
          ]
        );
        setLocationLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(coords);
      
      // Fetch nearby merchants with current location
      await fetchNearbyMerchants(coords.latitude, coords.longitude, radius);
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please enable GPS and try again.',
        [
          { text: 'Retry', onPress: requestLocationPermission },
          { text: 'Manual Entry', onPress: showManualLocationInput }
        ]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const showManualLocationInput = () => {
    Alert.prompt(
      'Enter Location',
      'Enter latitude and longitude separated by comma (e.g., 22.5726, 88.3639)',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Search', 
          onPress: (text) => {
            try {
              const [lat, lng] = text.split(',').map(coord => parseFloat(coord.trim()));
              if (!isNaN(lat) && !isNaN(lng)) {
                const coords = { latitude: lat, longitude: lng };
                setCurrentLocation(coords);
                fetchNearbyMerchants(lat, lng, radius);
              } else {
                Alert.alert('Error', 'Invalid coordinates format');
              }
            } catch (error) {
              Alert.alert('Error', 'Invalid coordinates format');
            }
          }
        }
      ],
      'plain-text',
      '22.5726, 88.3639'
    );
  };

  const fetchNearbyMerchants = async (lat, lng, radiusInMeters) => {
    try {
      setLoading(true);
      console.log('Fetching merchants for:', { lat, lng, radius: radiusInMeters });

      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=near_by_marchent',
        {
          lat: lat.toString(),
          lng: lng.toString(),
          radius: radiusInMeters
        }
      );

      console.log('Merchants response:', response.data);

      if (response.data.status === 'success') {
        const merchantsData = response.data.data || [];
        // Sort by distance (closest first)
        const sortedMerchants = merchantsData.sort((a, b) => 
          parseFloat(a.distance_km) - parseFloat(b.distance_km)
        );
        setMerchants(sortedMerchants);
      } else {
        Alert.alert('Info', 'No merchants found in your area');
        setMerchants([]);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
      Alert.alert('Error', 'Unable to fetch nearby merchants. Please try again.');
      setMerchants([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (currentLocation) {
      setRefreshing(true);
      await fetchNearbyMerchants(currentLocation.latitude, currentLocation.longitude, radius);
      setRefreshing(false);
    }
  }, [currentLocation, radius]);

  const updateRadius = async (newRadius) => {
    setRadius(newRadius);
    if (currentLocation) {
      await fetchNearbyMerchants(currentLocation.latitude, currentLocation.longitude, newRadius);
    }
  };

  const getFilteredMerchants = () => {
    let filtered = merchants;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(merchant =>
        merchant.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        merchant.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
        merchant.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        merchant.state.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category (if categories are implemented)
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(merchant => merchant.category_id === selectedCategory);
    }

    return filtered;
  };

  const getCategoryIcon = (categoryId) => {
    const icons = {
      '1': '🏪', // General Store
      '2': '🔌', // Electronics
      '3': '📚', // Books/Education
      '4': '🏥', // Medical/Pharmacy
      '5': '🍽️', // Food/Restaurant
    };
    return icons[categoryId] || '🏪';
  };

  const formatDistance = (distanceKm) => {
    const distance = parseFloat(distanceKm);
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const openInMaps = (latitude, longitude, businessName) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const label = businessName;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${businessName}`;
      Linking.openURL(googleMapsUrl);
    });
  };

  const MerchantCard = ({ merchant }) => (
    <TouchableOpacity 
      style={styles.merchantCard}
      onPress={() => {
        router.push({
          pathname: '/merchant',
          params: { qr_code: merchant.qr_code }
        });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.merchantIconContainer}>
          <View style={styles.merchantIcon}>
            <Text style={styles.merchantIconText}>
              {getCategoryIcon(merchant.category_id)}
            </Text>
          </View>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{formatDistance(merchant.distance_km)}</Text>
          </View>
        </View>
        
        <View style={styles.merchantInfo}>
          <Text style={styles.merchantName} numberOfLines={1}>
            {merchant.business_name}
          </Text>
          <Text style={styles.contactPerson} numberOfLines={1}>
            {merchant.contact_person}
          </Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {merchant.district}, {merchant.state}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => {/* Handle menu */}}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${merchant.mobile}`)}>
              <Text style={styles.infoValue}>{merchant.mobile}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmount}>₹{parseFloat(merchant.wallet).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => openInMaps(merchant.latitude, merchant.longitude, merchant.business_name)}
          >
            <Text style={styles.actionIcon}>📍</Text>
            <Text style={styles.actionText}>Directions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              router.push({
                pathname: '/merchant',
                params: { qr_code: merchant.qr_code }
              });
            }}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.payButton]}
            onPress={() => {
              if (!isLoggedIn) {
                Alert.alert(
                  'Login Required',
                  'Please login to make a payment.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Login', onPress: () => router.push('/') }
                  ]
                );
              } else {
                router.push({
                  pathname: '/qr-payment',
                  params: { 
                    merchantData: JSON.stringify(merchant),
                    qrCode: merchant.qr_code
                  }
                });
              }
            }}
          >
            <Text style={styles.payIcon}>💳</Text>
            <Text style={styles.payText}>Pay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const RadiusModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showRadiusModal}
      onRequestClose={() => setShowRadiusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Radius</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowRadiusModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.radiusContainer}>
            <Text style={styles.currentRadiusText}>
              Current: {radius < 1000 ? `${radius}m` : `${(radius / 1000).toFixed(1)}km`}
            </Text>
            
            <View style={styles.radiusOptions}>
              {[500, 1000, 2000, 5000, 10000, 20000, 50000].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radiusOption,
                    radius === r && styles.radiusOptionActive
                  ]}
                  onPress={() => setRadius(r)}
                >
                  <Text style={[
                    styles.radiusOptionText,
                    radius === r && styles.radiusOptionTextActive
                  ]}>
                    {r < 1000 ? `${r}m` : `${r / 1000}km`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.applyRadiusButton}
            onPress={() => {
              setShowRadiusModal(false);
              updateRadius(radius);
            }}
          >
            <Text style={styles.applyRadiusText}>Apply Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No Merchants Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try adjusting your search terms'
          : 'Try increasing your search radius'
        }
      </Text>
      <TouchableOpacity 
        style={styles.emptyActionButton}
        onPress={() => setShowRadiusModal(true)}
      >
        <Text style={styles.emptyActionText}>Adjust Search Radius</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Nearby Merchants</Text>
        
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={requestLocationPermission}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color="#5f259f" />
          ) : (
            <Text style={styles.headerActionText}>📍</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchants..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersRow}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowRadiusModal(true)}
          >
            <Text style={styles.filterText}>
              {radius < 1000 ? `${radius}m` : `${(radius / 1000).toFixed(1)}km`}
            </Text>
            <Text style={styles.filterIcon}>▼</Text>
          </TouchableOpacity>

          {currentLocation && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationInfoText}>
                📍 {getFilteredMerchants().length} merchants nearby
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      {loading || locationLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5f259f" />
          <Text style={styles.loadingText}>
            {locationLoading ? 'Getting your location...' : 'Finding nearby merchants...'}
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#5f259f']}
              tintColor="#5f259f"
            />
          }
        >
          {getFilteredMerchants().length > 0 ? (
            getFilteredMerchants().map((merchant) => (
              <MerchantCard key={merchant.id} merchant={merchant} />
            ))
          ) : (
            <EmptyState />
          )}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      <RadiusModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#5f259f',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#2c2c2c',
    textAlign: 'center',
  },
  headerAction: {
    padding: 8,
    marginLeft: 8,
  },
  headerActionText: {
    fontSize: 20,
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#6c757d',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c2c2c',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#6c757d',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#5f259f',
  },
  filterText: {
    fontSize: 14,
    color: '#5f259f',
    fontWeight: '500',
    marginRight: 4,
  },
  filterIcon: {
    fontSize: 10,
    color: '#5f259f',
  },
  locationInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  locationInfoText: {
    fontSize: 12,
    color: '#6c757d',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  merchantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  merchantIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  merchantIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5f259f',
  },
  merchantIconText: {
    fontSize: 20,
  },
  distanceBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#5f259f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c2c2c',
    marginBottom: 2,
  },
  contactPerson: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#6c757d',
  },
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    fontSize: 20,
    color: '#6c757d',
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#5f259f',
    fontWeight: '500',
  },
  walletAmount: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#5f259f',
    fontWeight: '500',
  },
  payButton: {
    backgroundColor: '#5f259f',
    borderColor: '#5f259f',
  },
  payIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  payText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c2c2c',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#5f259f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c2c2c',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6c757d',
  },
  radiusContainer: {
    padding: 20,
  },
  currentRadiusText: {
    fontSize: 16,
    color: '#5f259f',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  radiusOption: {
    width: '30%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  radiusOptionActive: {
    backgroundColor: '#5f259f',
    borderColor: '#5f259f',
  },
  radiusOptionText: {
    fontSize: 14,
    color: '#5f259f',
    fontWeight: '500',
  },
  radiusOptionTextActive: {
    color: '#fff',
  },
  applyRadiusButton: {
    backgroundColor: '#5f259f',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyRadiusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});