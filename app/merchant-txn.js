// screens/TransactionsScreen.jsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = 'https://offersclub.offerplant.com/opex/api.php';

const TransactionsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [updatingTxn, setUpdatingTxn] = useState(null);

  // Set initial filter based on route params
  useEffect(() => {
    if (params.filter) {
      const filterMap = {
        'pending': 'PENDING',
        'confirmed': 'CONFIRMED', 
        'rejected': 'REJECTED',
        'all': 'ALL'
      };
      setStatusFilter(filterMap[params.filter.toLowerCase()] || 'ALL');
    }
  }, [params.filter]);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const merchantId = await AsyncStorage.getItem('merchant_id');
      if (!merchantId) {
        Alert.alert('Error', 'Merchant ID not found');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}?task=merchant_transactions`, {
        merchant_id: parseInt(merchantId)
      });
      
      if (response.data.status === 'success') {
        setTransactions(response.data.data || []);
      } else {
        console.log('No transactions found');
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Network error. Please try again.');
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update transaction status
  const updateTransactionStatus = async (txnId, status) => {
    setUpdatingTxn(txnId);
    try {
      const response = await axios.post(`${API_BASE_URL}?task=update_txn`, {
        id: txnId,
        txn_status: status === 'CONFIRM' ? 'CONFIRMED' : 'REJECTED'
      });
      
      if (response.data.status === 'success' || response.status === 200) {
        // Update local state
        setTransactions(prev => 
          prev.map(txn => 
            txn.id === txnId 
              ? { ...txn, txn_status: status === 'CONFIRM' ? 'CONFIRMED' : 'REJECTED' }
              : txn
          )
        );
        Alert.alert('Success', `Transaction ${status.toLowerCase()}ed successfully`);
      } else {
        Alert.alert('Error', 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'Failed to update transaction. Please try again.');
    } finally {
      setUpdatingTxn(null);
    }
  };

  // Confirm transaction with alert
  const confirmTransaction = (txnId, amount) => {
    Alert.alert(
      'Confirm Transaction',
      `Are you sure you want to confirm transaction of ₹${amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: 'default',
          onPress: () => updateTransactionStatus(txnId, 'CONFIRM')
        }
      ]
    );
  };

  // Reject transaction with alert
  const rejectTransaction = (txnId, amount) => {
    Alert.alert(
      'Reject Transaction',
      `Are you sure you want to reject transaction of ₹${amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => updateTransactionStatus(txnId, 'REJECT')
        }
      ]
    );
  };

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    
    return transactions.filter(txn => {
      const safeSearch = (searchQuery || "").toLowerCase();

      const matchesSearch = 
        (txn.customer_name || "").toLowerCase().includes(safeSearch) ||
        (txn.txn_amount?.toString() || "").includes(searchQuery) ||
        (txn.id?.toString() || "").includes(searchQuery) ||
        (txn.customer_mobile || "").includes(searchQuery);
      
      const matchesFilter = 
        statusFilter === 'ALL' || 
        (txn.txn_status || txn.status) === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, statusFilter]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#FF9500';
      case 'CONFIRMED': return '#34C759';
      case 'REJECTED': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return 'time-outline';
      case 'CONFIRMED': return 'checkmark-circle';
      case 'REJECTED': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Refresh data
  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Transaction Item Component
  const TransactionItem = ({ item }) => {
    const txnStatus = item.txn_status || item.status;
    
    return (
    
      <View style={styles.transactionItem}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.businessName}>
              {item.customer_name || 'Unknown Customer'}
            </Text>
            <Text style={styles.transactionId}>
              ID: {(txnStatus === 'CONFIRMED') ? item.customer_mobile : item.id}
            </Text>
                <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
    
          
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{formatCurrency(item.txn_amount || item.amount)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(txnStatus) }]}>
              <Ionicons 
                name={getStatusIcon(txnStatus)} 
                size={12} 
                color="white" 
              />
              <Text style={styles.statusText}>{txnStatus}</Text>
            </View>
          </View>
        </View>
        
        
        {txnStatus === 'PENDING' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => rejectTransaction(item.id, item.txn_amount || item.amount)}
              disabled={updatingTxn === item.id}
            >
              {updatingTxn === item.id ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => confirmTransaction(item.id, item.txn_amount || item.amount)}
              disabled={updatingTxn === item.id}
            >
              {updatingTxn === item.id ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Confirm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Filter Modal Component
  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Transactions</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.filterLabel}>Status</Text>
          {['ALL', 'PENDING', 'CONFIRMED', 'REJECTED'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterOption,
                statusFilter === status && styles.filterOptionSelected
              ]}
              onPress={() => {
                setStatusFilter(status);
                setShowFilterModal(false);
              }}
            >
              <Text style={[
                styles.filterOptionText,
                statusFilter === status && styles.filterOptionTextSelected
              ]}>
                {status}
              </Text>
              {statusFilter === status && (
                <Ionicons name="checkmark" size={20} color="#5f259f" />
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              clearFilters();
              setShowFilterModal(false);
            }}
          >
            <Text style={styles.clearButtonText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
          <ActivityIndicator size="large" color="#5f259f" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView style={{flex: 1, backgroundColor: '#5f259f'}} edges={['top']}>
      {/* Header */}
      <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
      <View style={styles.container}>
      <View style={styles.header}>
        
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Transactions {statusFilter !== 'ALL' && `(${statusFilter})`}
        </Text>
        <TouchableOpacity onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, amount, ID, or mobile..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {(searchQuery || statusFilter !== 'ALL') && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearSearchButton}>
            <Text style={styles.clearSearchText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{filteredTransactions.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: '#FF9500' }]}>
            {filteredTransactions.filter(t => (t.txn_status || t.status) === 'PENDING').length}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Amount</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(
              filteredTransactions.reduce((sum, t) => sum + parseFloat(t.txn_amount || t.amount || 0), 0)
            )}
          </Text>
        </View>
      </View>

      {/* Active Filter Indicator */}
      {(statusFilter !== 'ALL' || searchQuery) && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            {statusFilter !== 'ALL' && `Status: ${statusFilter}`}
            {statusFilter !== 'ALL' && searchQuery && ' • '}
            {searchQuery && `Search: "${searchQuery}"`}
          </Text>
          <TouchableOpacity onPress={clearFilters}>
            <Ionicons name="close-circle" size={20} color="#5f259f" />
          </TouchableOpacity>
        </View>
      )}

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <TransactionItem item={item} />}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#5f259f"]}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || statusFilter !== 'ALL' 
                ? 'Try adjusting your search or filter' 
                : 'Transactions will appear here when customers make payments'
              }
            </Text>
            {(searchQuery || statusFilter !== 'ALL') && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <FilterModal />
    </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#5f259f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#5f259f',
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  clearSearchButton: {
    paddingHorizontal: 8,
  },
  clearSearchText: {
    color: '#5f259f',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f8ff',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#5f259f',
  },
  activeFilterText: {
    fontSize: 14,
    color: '#5f259f',
    fontWeight: '500',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 5,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  transactionItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  transactionId: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  mobileText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  confirmButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#5f259f',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  filterOptionSelected: {
    backgroundColor: '#F0F8FF',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#000',
  },
  filterOptionTextSelected: {
    color: '#5f259f',
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  clearButtonText: {
    color: '#5f259f',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransactionsScreen;