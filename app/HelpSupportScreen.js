import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Dimensions,
    Linking,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function HelpSupportScreen() {
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const quickLinks = [
    { id: 1, icon: 'help-circle-outline', title: 'General', color: '#5F259F' },
    { id: 2, icon: 'cash-outline', title: 'Cashback', color: '#00BAF2' },
    { id: 3, icon: 'pricetag-outline', title: 'Offers', color: '#FF6B6B' },
    { id: 4, icon: 'person-outline', title: 'Account', color: '#4CAF50' },
  ];

  const faqData = {
    general: [
      {
        question: 'What is OfferClub?',
        answer:
          'OfferClub is a platform that helps you save money by providing cashback and exclusive offers from shops in your nearby area. You can discover local deals, earn cashback on purchases, and enjoy special discounts at your favorite stores.',
      },
      {
        question: 'How does OfferClub work?',
        answer:
          "Simply download the OfferClub app, browse offers from nearby shops, visit the store, make your purchase, and claim your cashback or discount. It's that easy! The app uses your location to show relevant offers from stores around you.",
      },
      {
        question: 'Is OfferClub free to use?',
        answer:
          'Yes! OfferClub is completely free for users. There are no subscription fees or hidden charges. Just download the app and start saving money immediately.',
      },
      {
        question: 'Which areas does OfferClub cover?',
        answer:
          'OfferClub is continuously expanding. We currently have partnerships with shops in major cities and are adding new locations regularly. Enable location services to see offers available in your area.',
      },
    ],
    cashback: [
      {
        question: 'How do I earn cashback?',
        answer:
          'To earn cashback: 1) Browse available cashback offers in the app, 2) Visit the partner shop, 3) Show your OfferClub QR code or unique code before payment, 4) Complete your purchase, 5) Cashback will be credited to your OfferClub wallet within 24-48 hours.',
      },
      {
        question: 'When will I receive my cashback?',
        answer:
          'Cashback is typically credited to your OfferClub wallet within 24-48 hours after your purchase is verified. Some offers may have different processing times, which will be mentioned in the offer details.',
      },
      {
        question: 'How can I withdraw my cashback?',
        answer:
          "You can withdraw cashback to your bank account once you reach the minimum withdrawal amount (₹100). Go to 'My Wallet' > 'Withdraw' and follow the instructions. Funds are transferred within 3-5 business days.",
      },
      {
        question: 'Is there a limit on cashback earnings?',
        answer:
          "There's no upper limit on total cashback you can earn! However, individual offers may have their own terms and conditions, including maximum cashback per transaction or per user.",
      },
      {
        question: 'Why was my cashback rejected?',
        answer:
          "Cashback may be rejected if: the offer terms weren't followed, the QR code wasn't scanned before payment, you returned the purchased items, or there was a technical issue. Contact support with your transaction details for assistance.",
      },
    ],
    offers: [
      {
        question: 'How do I find offers near me?',
        answer:
          'Open the OfferClub app and enable location services. The app will automatically show you offers from nearby shops. You can also use the search and filter options to find specific types of offers or stores.',
      },
      {
        question: 'How do I redeem an offer?',
        answer:
          "To redeem an offer: 1) Select the offer you want to use, 2) Click 'Redeem' or 'Activate', 3) Visit the shop and show your unique code or QR code to the shopkeeper before making payment, 4) Complete your purchase and enjoy the discount!",
      },
      {
        question: 'Can I use multiple offers at once?',
        answer:
          'Generally, only one offer can be used per transaction unless specifically mentioned. Check the terms and conditions of each offer for details on combining offers.',
      },
      {
        question: "What if a shop doesn't accept my offer?",
        answer:
          'If a partner shop refuses to honor a valid offer, please take a screenshot of the offer and contact our support team immediately. We take such issues seriously and will investigate and resolve them promptly.',
      },
      {
        question: 'Do offers expire?',
        answer:
          "Yes, most offers have an expiration date mentioned in the offer details. Make sure to use them before they expire. You can check expiry dates in the 'My Offers' section of your app.",
      },
    ],
    account: [
      {
        question: 'How do I create an account?',
        answer:
          "Download the OfferClub app, click on 'Sign Up', enter your mobile number, verify with OTP, and complete your profile. It takes less than 2 minutes!",
      },
      {
        question: 'I forgot my password. What should I do?',
        answer:
          "Click on 'Forgot Password' on the login screen, enter your registered mobile number, verify the OTP, and create a new password.",
      },
      {
        question: 'How do I update my profile information?',
        answer:
          "Go to 'Profile' > 'Edit Profile' to update your name, email, address, and other details. Don't forget to save your changes!",
      },
      {
        question: 'Can I delete my account?',
        answer:
          "Yes, you can delete your account by going to 'Settings' > 'Account' > 'Delete Account'. Please note that this action is irreversible and all your data will be permanently removed.",
      },
    ],
  };

  const otherProducts = [
    'OfferPlant Blogs',
    'Startup Ideas',
    'News Portal',
    'TradeBook',
    'Flatica',
    'JapMala',
  ];

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleCall = () => {
    Linking.openURL('tel:+919431426600');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:ask@offerplant.com');
  };

  const handleLocation = () => {
    const address = '2nd Floor Godrej Building, Salempur Chapra Bihar 841301';
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
    Linking.openURL(url);
  };

  const scrollToSection = (section) => {
    Alert.alert('Navigate', `Scroll to ${section} section`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5F259F" />

      {/* Header */}
      <LinearGradient colors={['#5F259F', '#7B3FF2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => {router.back();}}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Links */}
        <View style={styles.quickLinksContainer}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          <View style={styles.quickLinksGrid}>
            {quickLinks.map((link) => (
              <TouchableOpacity
                key={link.id}
                style={[styles.quickLinkCard]}
                onPress={() => scrollToSection(link.title.toLowerCase())}
              >
                <View
                  style={[
                    styles.quickLinkIconContainer,
                    { backgroundColor: `${link.color}15` },
                  ]}
                >
                  <Ionicons name={link.icon} size={28} color={link.color} />
                </View>
                <Text style={styles.quickLinkTitle}>{link.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Sections */}
        <View style={styles.faqContainer}>
          <Text style={styles.sectionTitle}>
            Frequently Asked Questions
          </Text>

          {/* General Questions */}
          <View style={styles.faqCategory}>
            <View style={styles.categoryHeader}>
              <Ionicons name="help-circle" size={24} color="#5F259F" />
              <Text style={styles.categoryTitle}>General Questions</Text>
            </View>
            {faqData.general.map((faq, index) => {
              const faqIndex = `general-${index}`;
              return (
                <View key={faqIndex} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    onPress={() => toggleFAQ(faqIndex)}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons
                      name={
                        expandedFAQ === faqIndex
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={20}
                      color="#5F259F"
                    />
                  </TouchableOpacity>
                  {expandedFAQ === faqIndex && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Cashback Questions */}
          <View style={styles.faqCategory}>
            <View style={styles.categoryHeader}>
              <Ionicons name="cash" size={24} color="#00BAF2" />
              <Text style={[styles.categoryTitle, { color: '#00BAF2' }]}>
                Cashback Questions
              </Text>
            </View>
            {faqData.cashback.map((faq, index) => {
              const faqIndex = `cashback-${index}`;
              return (
                <View key={faqIndex} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    onPress={() => toggleFAQ(faqIndex)}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons
                      name={
                        expandedFAQ === faqIndex
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={20}
                      color="#00BAF2"
                    />
                  </TouchableOpacity>
                  {expandedFAQ === faqIndex && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Offers Questions */}
          <View style={styles.faqCategory}>
            <View style={styles.categoryHeader}>
              <Ionicons name="pricetag" size={24} color="#FF6B6B" />
              <Text style={[styles.categoryTitle, { color: '#FF6B6B' }]}>
                Offers Questions
              </Text>
            </View>
            {faqData.offers.map((faq, index) => {
              const faqIndex = `offers-${index}`;
              return (
                <View key={faqIndex} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    onPress={() => toggleFAQ(faqIndex)}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons
                      name={
                        expandedFAQ === faqIndex
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={20}
                      color="#FF6B6B"
                    />
                  </TouchableOpacity>
                  {expandedFAQ === faqIndex && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Account Questions */}
          <View style={styles.faqCategory}>
            <View style={styles.categoryHeader}>
              <Ionicons name="person" size={24} color="#4CAF50" />
              <Text style={[styles.categoryTitle, { color: '#4CAF50' }]}>
                Account Questions
              </Text>
            </View>
            {faqData.account.map((faq, index) => {
              const faqIndex = `account-${index}`;
              return (
                <View key={faqIndex} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    onPress={() => toggleFAQ(faqIndex)}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons
                      name={
                        expandedFAQ === faqIndex
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={20}
                      color="#4CAF50"
                    />
                  </TouchableOpacity>
                  {expandedFAQ === faqIndex && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

    </ScrollView>
    </View>
  );
}
const styles = {
  container: {
    flex: 1,    




    backgroundColor: '#f5f6fa',
    },
    header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 15,
    },
    headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    },
    backButton: {
    padding: 8,
    },
    headerTitle: {
    color: '#fff',  
    fontSize: 20,
    fontWeight: 'bold',
    },
    notificationButton: {
    padding: 8,
    },
    searchContainer: {  
    flexDirection: 'row',
    alignItems: 'center',
        
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,  
    height: 40,
    },
    searchIcon: {
    marginRight: 8,
    },
    searchInput: {
    flex: 1,    
    fontSize: 16,
    color: '#333',  
    },
    scrollView: {
    flex: 1,
    paddingHorizontal: 15,
    },
    quickLinksContainer: {  
    marginTop: 20,
    marginBottom: 10,
    },
    sectionTitle: { 
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    },
    quickLinksGrid: {   
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    },
    quickLinkCard: {
    width: (width - 60) / 2,    
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',    
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,    
    elevation: 3,   
    },
    quickLinkIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    },
    quickLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',  
    textAlign: 'center',
    },
    faqContainer: {
    marginBottom: 30,   
    },  
    faqCategory: {
    marginBottom: 20,
    },
    categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    },
    categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold', 
    marginLeft: 8,
    color: '#333',
    },

    faqItem: {
    backgroundColor: '#fff',
    borderRadius: 8,    
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
        
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    },
    faqQuestion: {  
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',   
    padding: 15,
    },
    faqQuestionText: {
    fontSize: 15,   
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
    },
    faqAnswer: {    
    borderTopWidth: 1,  
    borderTopColor: '#eee',
        
    padding: 15,
    backgroundColor: '#fafafa',
    },  
    faqAnswerText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,     

    }, contactSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
        
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
        
    elevation: 3,
    },
    contactSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,   
    }, contactMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    }, contactMethodButton: {
    flex: 1,
    alignItems: 'center',   
    padding: 10,    
    borderRadius: 8,        
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
    }, contactMethodText: {
    marginTop: 5,
    fontSize: 14,   
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',    
    }, otherProductsContainer: {
    marginBottom: 30,
    },  
    productItem: {
    backgroundColor: '#fff',
    borderRadius: 8,    
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    },
    productText: {
    fontSize: 15,
    color: '#333',      
    marginLeft: 10,
    fontWeight: '600',
    },
};