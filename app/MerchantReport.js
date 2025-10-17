import {
    FontAwesome5,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

const MerchantAnalyticsScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Monthly');
  const [isSharing, setIsSharing] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const reportRef = useRef();
  
  const fetchData = async () => {
    try {
      const merchantId = await AsyncStorage.getItem('merchant_id');
      if (!merchantId) {
        throw new Error('Merchant ID not found');
      }
      
      const response = await axios.get(
        `https://offersclub.offerplant.com/opex/merchant_report.php?merchant_id=${merchantId}`
      );
      
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getCustomerName = (customerId) => {
    // This would typically come from your API, but we'll generate dummy names for now
    const names = [
      'Raj Kumar', 'Priya Singh', 'Anil Sharma', 'Meena Patel', 
      'Vijay Mehta', 'Sunita Gupta', 'Rahul Jain', 'Neha Verma'
    ];
    return names[parseInt(customerId) % names.length];
  };
  
  const handleBack = () => {
    navigation.goBack();
  };
  
  const handleShareReport = async () => {
    if (!reportRef.current) return;
    
    try {
      setIsSharing(true);
      
      // Generate a filename with date
      const date = new Date();
      const filename = `BusinessReport_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}.png`;
      
      // Capture the view as an image
      const uri = await reportRef.current.capture();
      
      // For iOS, we need to ensure the file has a proper extension
      let fileUri = uri;
      if (Platform.OS === 'ios' && !uri.includes('.png')) {
        fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.copyAsync({
          from: uri,
          to: fileUri
        });
      }
      
      // Share the image
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Business Report',
        UTI: 'public.image'
      });
      
    } catch (error) {
      console.error('Error sharing report:', error);
      alert('Failed to share report. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };
  
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar backgroundColor="#5f259f" barStyle="dark-content" />
        <ActivityIndicator size="large" color="#5f259f" />
        <Text style={styles.loadingText}>Loading your business insights...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar backgroundColor="#5f259f" barStyle="light-content" />
        <MaterialIcons name="error-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Prepare chart data
  const monthlySalesData = {
    labels: data?.insights?.monthly_sales_trend?.map(item => {
      const [year, month] = item.month.split('-');
      return `${month}/${year.slice(2)}`;
    }) || [],
    datasets: [
      {
        data: data?.insights?.monthly_sales_trend?.map(item => 
          parseInt(item.sales)) || [0],
        color: (opacity = 1) => `rgba(95, 37, 159, ${opacity})`,
        strokeWidth: 2
      }
    ],
  };
  
  // Customer distribution data for pie chart
  const customerData = data?.insights?.top_customers || [];
  const totalCustomerSpent = customerData.reduce((sum, customer) => sum + parseInt(customer.total_spent), 0);
  
  const pieChartData = customerData.map((customer, index) => {
    const colors = ['#5f259f', '#713EBE', '#9B59B6', '#AF7AC5', '#D2B4DE'];
    return {
      name: customer.name || getCustomerName(customer.customer_id),
      spent: parseInt(customer.total_spent),
      color: colors[index % colors.length],
      legendFontColor: '#555555',
      legendFontSize: 12
    };
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar backgroundColor="#5f259f" barStyle="dark-content" />
      <LinearGradient
        colors={['#5f259f', '#713EBE']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Business Insights</Text>
            <Text style={styles.headerSubtitle}>{data?.business_name}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.shareButton, isSharing && styles.disabledButton]} 
            onPress={handleShareReport}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="share-outline" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Quick stats in header */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{formatCurrency(data?.wallet_balance)}</Text>
            <Text style={styles.quickStatLabel}>Wallet Balance</Text>
          </View>
          
          <View style={styles.quickStatDivider} />
          
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{formatCurrency(data?.description_report?.total_sales)}</Text>
            <Text style={styles.quickStatLabel}>Total Sales</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5f259f']} />
        }
      >
        <ViewShot ref={reportRef} options={{ format: "png", quality: 0.9 }}>
          {/* Overview Cards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#F1E8FF' }]}>
                  <FontAwesome5 name="exchange-alt" size={18} color="#5f259f" />
                </View>
                <Text style={styles.statAmount}>{data?.description_report?.total_transactions || 0}</Text>
                <Text style={styles.statLabel}>Transactions</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E8F4FD' }]}>
                  <FontAwesome5 name="users" size={18} color="#3498db" />
                </View>
                <Text style={styles.statAmount}>{data?.description_report?.unique_customers || 0}</Text>
                <Text style={styles.statLabel}>Unique Customers</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E5F7ED' }]}>
                  <MaterialCommunityIcons name="repeat" size={18} color="#27AE60" />
                </View>
                <Text style={styles.statAmount}>{data?.description_report?.repeat_customers || 0}</Text>
                <Text style={styles.statLabel}>Repeat Transactions</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FEF5E7' }]}>
                  <FontAwesome5 name="gift" size={18} color="#F39C12" />
                </View>
                <Text style={styles.statAmount}>{formatCurrency(data?.description_report?.total_cashback)}</Text>
                <Text style={styles.statLabel}>Total Cashback</Text>
              </View>
            </View>
          </View>

          {/* Sales Trend Chart */}
          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sales Trend</Text>
              <TouchableOpacity style={styles.periodSelector}>
                <Text style={styles.periodText}>{selectedPeriod}</Text>
                <MaterialIcons name="keyboard-arrow-down" size={14} color="#777" />
              </TouchableOpacity>
            </View>
            
            {monthlySalesData.labels.length > 0 ? (
              <View style={styles.chartContainer}>
                <LineChart
                  data={monthlySalesData}
                  width={chartWidth}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(95, 37, 159, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                    style: {
                      borderRadius: 12,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#5f259f',
                    },
                    propsForBackgroundLines: {
                      stroke: '#f0f0f0',
                    },
                    formatYLabel: (value) => `₹${parseInt(value).toLocaleString('en-IN')}`,
                  }}
                  bezier
                  style={styles.chart}
                />
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#5f259f' }]} />
                    <Text style={styles.legendText}>Sales Revenue</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <MaterialCommunityIcons name="chart-line" size={52} color="#D1C4E9" />
                <Text style={styles.noDataText}>No sales data available yet</Text>
                <Text style={styles.noDataSubtext}>Start making transactions to see your sales trend</Text>
              </View>
            )}
          </View>

          {/* Key Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Performance Metrics</Text>
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <MaterialCommunityIcons name="currency-inr" size={18} color="#5f259f" />
                  <Text style={styles.metricTitle}>Avg. Transaction</Text>
                </View>
                <Text style={styles.metricValue}>{formatCurrency(data?.description_report?.average_txn_value)}</Text>
                <Text style={styles.metricDesc}>Per transaction</Text>
                <View style={styles.metricIndicator}>
                  {parseFloat(data?.description_report?.average_txn_value) > 1000 ? (
                    <MaterialIcons name="trending-up" size={14} color="#27AE60" />
                  ) : (
                    <MaterialIcons name="trending-down" size={14} color="#E74C3C" />
                  )}
                  <Text style={[
                    styles.metricTrend, 
                    { color: parseFloat(data?.description_report?.average_txn_value) > 1000 ? '#27AE60' : '#E74C3C' }
                  ]}>
                    {parseFloat(data?.description_report?.average_txn_value) > 1000 ? 'Above' : 'Below'} average
                  </Text>
                </View>
              </View>
              
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <MaterialIcons name="repeat" size={18} color="#5f259f" />
                  <Text style={styles.metricTitle}>Txn Per Customer</Text>
                </View>
                <Text style={styles.metricValue}>{data?.description_report?.avg_txn_per_customer || 0}</Text>
                <Text style={styles.metricDesc}>Average repeat rate</Text>
                <View style={styles.metricIndicator}>
                  {parseFloat(data?.description_report?.avg_txn_per_customer) >= 2 ? (
                    <MaterialIcons name="trending-up" size={14} color="#27AE60" />
                  ) : (
                    <MaterialIcons name="trending-down" size={14} color="#E74C3C" />
                  )}
                  <Text style={[
                    styles.metricTrend, 
                    { color: parseFloat(data?.description_report?.avg_txn_per_customer) >= 2 ? '#27AE60' : '#E74C3C' }
                  ]}>
                    {parseFloat(data?.description_report?.avg_txn_per_customer) >= 2 ? 'Good' : 'Needs improvement'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Top Customers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Customers</Text>
            
            {data?.insights?.top_customers?.length > 0 ? (
              <>
                <View style={styles.pieChartContainer}>
                  <PieChart
                    data={pieChartData}
                    width={chartWidth}
                    height={180}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                    }}
                    accessor="spent"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[10, -5]}
                    absolute
                  />
                </View>
                
                <View style={styles.customersContainer}>
                  <View style={styles.customerHeader}>
                    <Text style={styles.customerHeaderText}>Customer</Text>
                    <Text style={styles.customerHeaderText}>Spending</Text>
                  </View>
                  
                  {data?.insights?.top_customers?.map((customer, index) => {
                    const customerName = customer.name || getCustomerName(customer.customer_id);
                    const initials = customerName.split(' ').map(n => n[0]).join('').toUpperCase();
                    
                    return (
                      <View key={index} style={styles.customerItem}>
                        <View style={styles.customerInfo}>
                          <View style={[styles.customerAvatar, {backgroundColor: pieChartData[index]?.color}]}>
                            <Text style={styles.customerInitials}>{initials}</Text>
                          </View>
                          <View>
                            <Text style={styles.customerName}>{customerName}</Text>
                            <Text style={styles.customerId}>ID: {customer.customer_id}</Text>
                          </View>
                        </View>
                        <View style={styles.customerStats}>
                          <Text style={styles.customerAmount}>{formatCurrency(customer.total_spent)}</Text>
                          <View style={styles.customerPercentContainer}>
                            <View style={[
                              styles.customerPercentBar,
                              {
                                width: `${Math.min(Math.round((parseInt(customer.total_spent) / totalCustomerSpent) * 100), 100)}%`,
                                backgroundColor: pieChartData[index]?.color
                              }
                            ]} />
                            <Text style={styles.customerPercent}>
                              {Math.round((parseInt(customer.total_spent) / totalCustomerSpent) * 100)}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  
                  <TouchableOpacity style={styles.viewAllButton}>
                    <Text style={styles.viewAllText}>View All Customers</Text>
                    <Ionicons name="chevron-forward" size={16} color="#5f259f" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <FontAwesome5 name="user-friends" size={52} color="#D1C4E9" />
                <Text style={styles.noDataText}>No customer data available yet</Text>
                <Text style={styles.noDataSubtext}>Customer data will appear as transactions occur</Text>
              </View>
            )}
          </View>
          
          {/* Profit Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profit Summary</Text>
            <View style={styles.profitCard}>
              <View style={styles.profitHeader}>
                <View>
                  <Text style={styles.profitTitle}>Net Earnings</Text>
                  <Text style={styles.profitAmount}>{formatCurrency(data?.profit_summary?.net_earning)}</Text>
                </View>
                <View style={styles.profitBadge}>
                  <Text style={styles.profitBadgeText}>This Month</Text>
                </View>
              </View>
              
              <View style={styles.profitDivider} />
              
              <View style={styles.profitDetails}>
                <View style={styles.profitItem}>
                  <View style={styles.profitItemHeader}>
                    <View style={[styles.profitIndicator, { backgroundColor: '#5f259f' }]} />
                    <Text style={styles.profitItemTitle}>Total Revenue</Text>
                  </View>
                  <Text style={styles.profitItemValue}>{formatCurrency(data?.profit_summary?.total_revenue)}</Text>
                </View>
                
                <View style={styles.profitItem}>
                  <View style={styles.profitItemHeader}>
                    <View style={[styles.profitIndicator, { backgroundColor: '#E74C3C' }]} />
                    <Text style={styles.profitItemTitle}>Cashback Spent</Text>
                  </View>
                  <Text style={[styles.profitItemValue, { color: '#E74C3C' }]}>- {formatCurrency(data?.profit_summary?.cashback_spent)}</Text>
                </View>
                
                <View style={styles.profitItem}>
                  <View style={styles.profitItemHeader}>
                    <View style={[styles.profitIndicator, { backgroundColor: '#F39C12' }]} />
                    <Text style={styles.profitItemTitle}>Platform Fee</Text>
                  </View>
                  <Text style={[styles.profitItemValue, { color: '#F39C12' }]}>- {formatCurrency(data?.profit_summary?.platform_fee)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#95A5A6" style={styles.footerIcon} />
            <Text style={styles.footerText}>
              Data updated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </Text>
          </View>
        </ViewShot>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#5f259f',
    borderRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  shareButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  chartSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    zIndex: 1, // Ensure chart is rendered properly
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 12,
    color: '#666',
    marginRight: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  chart: {
    marginLeft: -16, // Adjust for internal chart padding
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  noDataContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
    height: 200,
  },
  noDataText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  noDataSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricDesc: {
    fontSize: 12,
    color: '#777',
    marginBottom: 12,
  },
  metricIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  metricTrend: {
    fontSize: 12,
    marginLeft: 4,
  },
  pieChartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
  },
  customersContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  customerId: {
    fontSize: 12,
    color: '#999',
  },
  customerStats: {
    alignItems: 'flex-end',
    flex: 1,
  },
  customerAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerPercentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  customerPercentBar: {
    height: 4,
    borderRadius: 2,
    marginRight: 6,
  },
  customerPercent: {
    fontSize: 12,
    color: '#777',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#5f259f',
    fontWeight: '500',
    marginRight: 4,
  },
  profitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  profitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profitTitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 4,
  },
  profitAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  profitBadge: {
    backgroundColor: '#F1E8FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  profitBadgeText: {
    fontSize: 12,
    color: '#5f259f',
    fontWeight: '500',
  },
  profitDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
  },
  profitDetails: {
    
  },
  profitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profitItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profitIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  profitItemTitle: {
    fontSize: 14,
    color: '#555',
  },
  profitItemValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  footerIcon: {
    marginRight: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#95A5A6',
  },
});

export default MerchantAnalyticsScreen;