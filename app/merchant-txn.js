// screens/TransactionsScreen.jsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = 'https://offersclub.offerplant.com/opex/api.php';

const TransactionsScreen = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [updatingTxn, setUpdatingTxn] = useState(null);

  // Fetch transactions
  const fetchTransactions = async () => {
    const merchantId = await AsyncStorage.getItem('merchant_id'); // Replace with dynamic merchant ID as needed
    try {
      const response = await axios.post(`${API_BASE_URL}?task=merchant_transactions`, {
        merchant_id: merchantId
      });
      
      if (response.data.status === 'success') {
        setTransactions(response.data.data);
      } else {
        Alert.alert('Error', 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Network error. Please try again.');
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
        txn_status: status === 'CONFIRM' ? 'CONFIRMED' : 'REJECTED' // Note: keeping the typo as per API specification
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
        //Alert.alert('Success', `Transaction ${status.toLowerCase()}ed successfully`);
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
    return transactions.filter(txn => {
      const matchesSearch = 
        txn.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.txn_amount.toString().includes(searchQuery) ||
        txn.id.toString().includes(searchQuery);
      
      const matchesFilter = 
        statusFilter === 'ALL' || 
        txn.txn_status === statusFilter;

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
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Refresh data
  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Transaction Item Component
  const TransactionItem = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.businessName}>{item.customer_name}</Text>
          <Text style={styles.transactionId}>ID: {(item.txn_status === 'CONFIRMED')?item.customer_mobile:item.id} </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>₹{item.txn_amount}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.txn_status) }]}>
            <Ionicons 
              name={getStatusIcon(item.txn_status)} 
              size={12} 
              color="white" 
            />
            <Text style={styles.statusText}>{item.txn_status}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
      
      {item.txn_status === 'PENDING' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => rejectTransaction(item.id, item.txn_amount)}
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
            onPress={() => confirmTransaction(item.id, item.txn_amount)}
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
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
         <StatusBar backgroundColor="#5f259f" barStyle="dark-content" />
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      
      <View style={styles.header}>
       <StatusBar backgroundColor="#5f259f" barStyle="dark-content" />
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by business name, amount, or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
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
            {filteredTransactions.filter(t => t.txn_status === 'PENDING').length}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Amount</Text>
          <Text style={styles.summaryValue}>
            ₹{filteredTransactions.reduce((sum, t) => sum + parseFloat(t.txn_amount), 0)}
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem item={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
                : 'Transactions will appear here'
              }
            </Text>
          </View>
        }
      />

      <FilterModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 5,
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
    maxHeight: '50%',
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
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default TransactionsScreen;