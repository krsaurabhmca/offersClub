import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WalletHistory = () => {
  const [payoutData, setPayoutData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    pendingAmount: 0,
    completedAmount: 0,
    totalTransactions: 0,
  });

  // Fetch payout history from API
  const fetchPayoutHistory = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        Alert.alert('Error', 'Customer ID not found');
        return;
      }

      const response = await fetch(
        'https://offersclub.offerplant.com/opex/api.php?task=withdraw_history',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ customer_id: parseInt(customerId) }),
        }
      );

      const result = await response.json();
      
      if (result.status === 'success') {
        setPayoutData(result.data);
        setFilteredData(result.data);
        calculateSummary(result.data);
      } else {
        Alert.alert('Error', 'Failed to fetch payout history');
      }
    } catch (error) {
      console.error('Error fetching payout history:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate summary statistics
  const calculateSummary = (data) => {
    const summary = data.reduce(
      (acc, transaction) => {
        const amount = parseFloat(transaction.amount);
        acc.totalAmount += amount;
        acc.totalTransactions += 1;
        
        if (transaction.txn_status === 'COMPLETED') {
          acc.completedAmount += amount;
        } else if (transaction.txn_status === 'PENDING') {
          acc.pendingAmount += amount;
        }
        
        return acc;
      },
      { totalAmount: 0, pendingAmount: 0, completedAmount: 0, totalTransactions: 0 }
    );
    
    setSummary(summary);
  };

  // Handle search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredData(payoutData);
    } else {
      const filtered = payoutData.filter(
        (item) =>
          item.amount.toLowerCase().includes(query.toLowerCase()) ||
          item.txn_status.toLowerCase().includes(query.toLowerCase()) ||
          item.txn_date.includes(query)
      );
      setFilteredData(filtered);
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayoutHistory();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return '#00C853';
      case 'PENDING':
        return '#FF9800';
      default:
        return '#757575';
    }
  };

  // Render transaction item
  const renderTransactionItem = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionAmount}>₹{item.amount}</Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.txn_date)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.txn_status) }]}>
          <Text style={styles.statusText}>{item.txn_status}</Text>
        </View>
      </View>
      <View style={styles.transactionFooter}>
        <Text style={styles.transactionId}>Transaction ID: {item.req_no}</Text>
        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color="#9E9E9E" 
        />
      </View>
    </View>
  );

  // Render summary cards
  const renderSummaryCards = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.totalCard]}>
          <Text style={styles.summaryAmount}>₹{summary.totalAmount.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Total Withdrawn</Text>
        </View>
        <View style={[styles.summaryCard, styles.pendingCard]}>
          <Text style={styles.summaryAmount}>₹{summary.pendingAmount.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.completedCard]}>
          <Text style={styles.summaryAmount}>₹{summary.completedAmount.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={[styles.summaryCard, styles.countCard]}>
          <Text style={styles.summaryAmount}>{summary.totalTransactions}</Text>
          <Text style={styles.summaryLabel}>Transactions</Text>
        </View>
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet-outline" size={64} color="#E0E0E0" />
      <Text style={styles.emptyStateTitle}>No Transactions Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        Your payout history will appear here once you make withdrawals.
      </Text>
    </View>
  );

  useEffect(() => {
    fetchPayoutHistory();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
          <Text style={styles.loadingText}>Loading payout history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => { router.back() }}  >
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout History</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={24} color="#5C6BC0" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9E9E9E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9E9E9E"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#9E9E9E" />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Transaction List */}
      <FlatList
        data={filteredData}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#5C6BC0']}
            tintColor="#5C6BC0"
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#212121',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#5C6BC0',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#00C853',
  },
  countCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#757575',
    textTransform: 'uppercase',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#757575',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  transactionId: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WalletHistory;