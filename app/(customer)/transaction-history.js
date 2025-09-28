import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function TransactionHistoryScreen() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    loadCustomerId();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchQuery, transactions]);

  const loadCustomerId = async () => {
    try {
      const id = await AsyncStorage.getItem('customer_id');
      if (id) {
        setCustomerId(id);
        fetchTransactions(id);
      } else {
        Alert.alert('Error', 'Customer information not found');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to load customer information');
      router.back();
    }
  };

  const fetchTransactions = async (id) => {
    try {
      setLoading(true);
      const response = await axios.post(
        'https://offersclub.offerplant.com/opex/api.php?task=customer_transactions',
        { customer_id: parseInt(id) }
      );

      if (response.data.status === 'success') {
        const txnData = response.data.data || [];
        setTransactions(txnData);
        
        // Calculate total amount
        const total = txnData.reduce((sum, txn) => sum + parseFloat(txn.txn_amount), 0);
        setTotalAmount(total);
      } else {
        Alert.alert('Error', 'Failed to load transaction history');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions(customerId);
    setRefreshing(false);
  }, [customerId]);

  const filterTransactions = () => {
    if (!searchQuery.trim()) {
      setFilteredTransactions(transactions);
    } else {
      const filtered = transactions.filter(txn =>
        txn.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.txn_amount.includes(searchQuery) ||
        txn.id.includes(searchQuery)
      );
      setFilteredTransactions(filtered);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'CONFIRMED':
        return '#28a745';
      case 'PENDING':
        return '#ffc107';
      case 'REJECTED':
        return '#dc3545';
      default:
        return '#5f259f';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Completed';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recent';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    }
  };

  const getTransactionIcon = (status) => {
    switch (status) {
      case 'success':
      case 'CONFIRMED':
        return { name: 'check-circle', library: 'MaterialIcons', color: '#28a745' };
      case 'PENDING':
        return { name: 'schedule', library: 'MaterialIcons', color: '#ffc107' };
      case 'REJECTED':
        return { name: 'cancel', library: 'MaterialIcons', color: '#dc3545' };
      default:
        return { name: 'payment', library: 'MaterialIcons', color: '#5f259f' };
    }
  };

  const TransactionCard = ({ transaction }) => {
    const iconData = getTransactionIcon(transaction.txn_status);
    
    return (
      <TouchableOpacity style={styles.transactionCard} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.transactionInfo}>
            <View style={styles.transactionIcon}>
              <MaterialIcons 
                name={iconData.name} 
                size={24} 
                color={iconData.color} 
              />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.merchantName} numberOfLines={1}>
                {transaction.business_name}
              </Text>
              <Text style={styles.transactionId}>TXN{transaction.id}</Text>
              <Text style={styles.dateText}>{formatDate(transaction.created_at)}</Text>
            </View>
          </View>
          
          <View style={styles.amountSection}>
            <Text style={styles.amountText}>₹{parseFloat(transaction.txn_amount).toFixed(2)}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(transaction.txn_status) }
            ]}>
              <Text style={styles.statusText}>
                {getStatusText(transaction.txn_status)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const SummaryCard = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <MaterialIcons name="account-balance-wallet" size={20} color="#5f259f" />
        <Text style={styles.summaryTitle}>Transaction Summary</Text>
      </View>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          {/* <View style={styles.summaryIconContainer}>
            <MaterialIcons name="receipt-long" size={16} color="#5f259f" />
          </View> */}
          <Text style={styles.summaryValue}>{transactions.length}</Text>
          <Text style={styles.summaryLabel}>Total Transactions</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          {/* <View style={styles.summaryIconContainer}>
            <MaterialIcons name="currency-rupee" size={16} color="#5f259f" />
          </View> */}
          <Text style={styles.summaryValue}>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
          <Text style={styles.summaryLabel}>Total Amount</Text>
        </View>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Feather name="file-text" size={64} color="#d1d5db" />
      </View>
      <Text style={styles.emptyTitle}>No Transactions Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'No transactions match your search criteria'
          : 'You haven\'t made any transactions yet'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => router.push('/qr-scanner')}
        >
          <MaterialIcons name="qr-code-scanner" size={16} color="#fff" />
          <Text style={styles.emptyButtonText}>Make Your First Payment</Text>
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
        
        <Text style={styles.headerTitle}>Transaction History</Text>
        
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#5f259f" />
          ) : (
            <MaterialIcons name="refresh" size={24} color="#5f259f" />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <MaterialIcons name="close" size={16} color="#6c757d" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5f259f" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
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
          {/* Summary Card */}
          {transactions.length > 0 && <SummaryCard />}

          {/* Results Header */}
          {filteredTransactions.length > 0 && (
            <View style={styles.resultsHeader}>
              <MaterialIcons name="list" size={16} color="#6c757d" />
              <Text style={styles.resultsText}>
                {searchQuery 
                  ? `${filteredTransactions.length} results found`
                  : `${filteredTransactions.length} transactions`
                }
              </Text>
            </View>
          )}

          {/* Transaction List */}
          {filteredTransactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </View>
          ) : (
            <EmptyState />
          )}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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
  content: {
    flex: 1,
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
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c2c2c',
    marginLeft: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryIconContainer: {
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5f259f',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e9ecef',
    marginHorizontal: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    marginLeft: 8,
  },
  transactionsList: {
    paddingHorizontal: 16,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  transactionDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c2c2c',
    marginBottom: 2,
  },
  transactionId: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#6c757d',
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c2c2c',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5f259f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});