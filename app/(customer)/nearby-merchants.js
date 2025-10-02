import {
  Ionicons,
  MaterialIcons
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
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
  const params = useLocalSearchParams();
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [radius, setRadius] = useState(5000); // Default 5km
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(params.categoryId || 'ALL');
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    requestLocationPermission();
  }, []);

  useEffect(() => {
    // If coming from category selection, update the filter
    if (params.categoryId) {
      setSelectedCategory(params.categoryId);
    }
  }, [params.categoryId]);

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
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to find nearby merchants.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
            { text: 'Manual Entry', onPress: showManualLocationInput }
          ]
        );
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(coords);
      await fetchNearbyMerchants(coords.latitude, coords.longitude, radius);
      
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationLoading(false);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again or enter manually.',
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
      'Enter latitude and longitude separated by comma\n(e.g., 22.5726, 88.3639)',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Search', 
          onPress: (text) => {
            try {
              if (!text || !text.trim()) return;
              
              const [lat, lng] = text.split(',').map(coord => parseFloat(coord.trim()));
              
              if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                Alert.alert('Error', 'Please enter valid coordinates\nLatitude: -90 to 90\nLongitude: -180 to 180');
                return;
              }
              
              const coords = { latitude: lat, longitude: lng };
              setCurrentLocation(coords);
              fetchNearbyMerchants(lat, lng, radius);
            } catch (error) {
              Alert.alert('Error', 'Invalid coordinates format. Please use: lat, lng');
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
      
      const requestData = {
        lat: parseFloat(lat).toFixed(6),
        lng: parseFloat(lng).toFixed(6),
        radius: parseInt(radiusInMeters)
      };
      
      console.log('Fetching merchants with params:', requestData);

      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=near_by_marchent',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000
        }
      );

      console.log('API Response:', response.data);

      if (response.data && response.data.status === 'success') {
        const merchantsData = response.data.data || [];
        
        // Filter by distance and sort
        const filteredMerchants = merchantsData
          .filter(merchant => {
            const distance = parseFloat(merchant.distance_km) * 1000; // Convert to meters
            return distance <= radiusInMeters;
          })
          .sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));
        
        setMerchants(filteredMerchants);
        
        if (filteredMerchants.length === 0) {
          Alert.alert(
            'No Merchants Found', 
            `No merchants found within ${radiusInMeters < 1000 ? radiusInMeters + 'm' : (radiusInMeters/1000) + 'km'}. Try increasing the search radius.`
          );
        }
      } else {
        console.log('API returned:', response.data);
        setMerchants([]);
        Alert.alert('Info', response.data?.message || 'No merchants found in your area');
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
      setMerchants([]);
      
      if (error.code === 'ECONNABORTED') {
        Alert.alert('Timeout', 'Request took too long. Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'Unable to fetch nearby merchants. Please check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (currentLocation) {
      setRefreshing(true);
      await fetchNearbyMerchants(currentLocation.latitude, currentLocation.longitude, radius);
      setRefreshing(false);
    } else {
      await requestLocationPermission();
    }
  }, [currentLocation, radius]);

  const updateRadius = async (newRadius) => {
    if (newRadius === radius) return;
    
    setRadius(newRadius);
    setShowRadiusModal(false);
    
    if (currentLocation) {
      await fetchNearbyMerchants(currentLocation.latitude, currentLocation.longitude, newRadius);
    }
  };

  const getFilteredMerchants = () => {
    let filtered = merchants;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(merchant =>
        merchant.business_name?.toLowerCase().includes(query) ||
        merchant.contact_person?.toLowerCase().includes(query) ||
        merchant.district?.toLowerCase().includes(query) ||
        merchant.state?.toLowerCase().includes(query) ||
        merchant.address?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'ALL' && selectedCategory) {
      filtered = filtered.filter(merchant => merchant.category_id === selectedCategory);
    }

    return filtered;
  };

  const getCategoryIcon = (categoryId) => {
    const icons = {
      '1': 'restaurant-outline',     // Restaurants
      '2': 'cart-outline',           // Groceries  
      '3': 'laptop-outline',         // Electronics
      '4': 'shirt-outline',          // Fashion
      '5': 'medkit-outline',         // Pharmacy
      '6': 'leaf-outline',           // Beauty & Wellness
      '7': 'book-outline',           // Books & Stationery
      '8': 'barbell-outline',        // Sports & Fitness
      '9': 'airplane-outline',       // Travel & Tickets
      '10': 'grid-outline',          // Others
    };
    return icons[categoryId] || 'storefront-outline';
  };

  const formatDistance = (distanceKm) => {
    const distance = parseFloat(distanceKm || 0);
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const openInMaps = (latitude, longitude, businessName) => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Invalid location coordinates');
      return;
    }

    const scheme = Platform.select({ 
      ios: 'maps:0,0?q=', 
      android: 'geo:0,0?q=' 
    });
    const latLng = `${lat},${lng}`;
    const label = encodeURIComponent(businessName || 'Merchant Location');
    
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${label}`;
      Linking.openURL(googleMapsUrl).catch(() => {
        Alert.alert('Error', 'Unable to open maps application');
      });
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
            <Ionicons 
              name={getCategoryIcon(merchant.category_id)} 
              size={24} 
              color="#5f259f" 
            />
          </View>
          <View style={styles.distanceBadge}>
            <MaterialIcons name="location-on" size={12} color="#fff" />
            <Text style={styles.distanceText}>{formatDistance(merchant.distance_km)}</Text>
          </View>
        </View>
        
        <View style={styles.merchantInfo}>
          <Text style={styles.merchantName} numberOfLines={1}>
            {merchant.business_name || 'Unknown Business'}
          </Text>
          <Text style={styles.contactPerson} numberOfLines={1}>
            <Ionicons name="person-outline" size={14} color="#6c757d" />
            {' '}{merchant.contact_person || 'Contact Person'}
          </Text>
          <Text style={styles.locationText} numberOfLines={2}>
            <Ionicons name="location-outline" size={12} color="#6c757d" />
            {' '}{merchant.address ? `${merchant.address}, ` : ''}{merchant.district}, {merchant.state}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => {/* Handle favorite */}}
        >
          <Ionicons name="heart-outline" size={20} color="#6c757d" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={16} color="#5f259f" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Business Hours</Text>
              <Text style={styles.infoValue}>
                {merchant.business_hours || '9:00 AM - 9:00 PM'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <MaterialIcons name="category" size={16} color="#5f259f" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>
                {merchant.category_name || 'General Store'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => openInMaps(merchant.latitude, merchant.longitude, merchant.business_name)}
          >
            <Ionicons name="location-outline" size={16} color="#5f259f" />
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
            <Ionicons name="information-circle-outline" size={16} color="#5f259f" />
            <Text style={styles.actionText}>View Details</Text>
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
            <MaterialIcons name="payment" size={16} color="#fff" />
            <Text style={styles.payText}>Claim Now</Text>
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
              <Ionicons name="close" size={24} color="#6c757d" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.radiusContainer}>
            <Text style={styles.currentRadiusText}>
              Current: {radius < 1000 ? `${radius}m` : `${(radius / 1000).toFixed(1)}km`}
            </Text>
            
            <View style={styles.radiusOptions}>
              {[500, 1000, 2000, 5000, 10000, 25000, 50000, 100000].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radiusOption,
                    radius === r && styles.radiusOptionActive
                  ]}
                  onPress={() => updateRadius(r)}
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

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowRadiusModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="storefront-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Merchants Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `No results for "${searchQuery}". Try different keywords.`
          : `No merchants found within ${radius < 1000 ? radius + 'm' : (radius/1000) + 'km'}`
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity 
          style={styles.emptyActionButton}
          onPress={() => setShowRadiusModal(true)}
        >
          <Ionicons name="resize-outline" size={16} color="#fff" />
          <Text style={styles.emptyActionText}>Increase Search Radius</Text>
        </TouchableOpacity>
      )}
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
          <Ionicons name="arrow-back" size={24} color="#5f259f" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {params.categoryName ? `${params.categoryName} Merchants` : 'Nearby Merchants'}
          </Text>
          {currentLocation && (
            <Text style={styles.headerSubtitle}>
              {getFilteredMerchants().length} merchants found
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={requestLocationPermission}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color="#5f259f" />
          ) : (
            <Ionicons name="location" size={24} color="#5f259f" />
          )}
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchants, location..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#6c757d" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersRow}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowRadiusModal(true)}
          >
            <Ionicons name="resize-outline" size={16} color="#5f259f" />
            <Text style={styles.filterText}>
              {radius < 1000 ? `${radius}m` : `${(radius / 1000).toFixed(1)}km`}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#5f259f" />
          </TouchableOpacity>

          {currentLocation && (
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={14} color="#00C851" />
              <Text style={styles.locationInfoText}>
                Location enabled
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
              <MerchantCard key={merchant.id || merchant.qr_code} merchant={merchant} />
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c2c2c',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
    marginLeft: 8,
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
    marginRight: 8,
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
    marginHorizontal: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInfoText: {
    fontSize: 12,
    color: '#00C851',
    marginLeft: 4,
    fontWeight: '500',
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
    alignItems: 'flex-start',
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
    borderColor: '#e9ecef',
  },
  distanceBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#5f259f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 2,
  },
  merchantInfo: {
    flex: 1,
    paddingRight: 8,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c2c2c',
    marginBottom: 4,
  },
  contactPerson: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 8,
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: '#2c2c2c',
    fontWeight: '500',
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
  actionText: {
    fontSize: 12,
    color: '#5f259f',
    fontWeight: '500',
    marginLeft: 4,
  },
  payButton: {
    backgroundColor: '#5f259f',
    borderColor: '#5f259f',
  },
  payText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c2c2c',
    marginTop: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5f259f',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
    width: '23%',
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
  modalActions: {
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});