// import { OneSignal } from 'react-native-onesignal';

// class OneSignalHelper {
//   // Initialize OneSignal
//   static async initialize() {
//     try {
//       // Check if already initialized
//       const userId = await OneSignal.User.getExternalId();
//       if (userId) {
//         console.log('OneSignal already initialized for user:', userId);
//         return;
//       }
//     } catch (error) {
//       console.log('Initializing OneSignal...');
//     }
//   }

//   // Login user with OneSignal
//   static async loginUser(userId) {
//     try {
//       // Login with external ID
//       await OneSignal.login(userId.toString());
      
//       // Check and request permission
//       const permission = await OneSignal.Notifications.getPermissionAsync();
//       if (!permission) {
//         await OneSignal.Notifications.requestPermission(true);
//       }
      
//       // Ensure user is subscribed
//       const isOptedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
//       if (!isOptedIn) {
//         await OneSignal.User.pushSubscription.optIn();
//       }
      
//       // Get subscription info
//       const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
//       const token = await OneSignal.User.pushSubscription.getTokenAsync();
      
//       console.log('OneSignal Login Success:', {
//         userId,
//         subscriptionId,
//         token: token ? 'Token received' : 'No token'
//       });
      
//       return { success: true, subscriptionId };
//     } catch (error) {
//       console.error('OneSignal Login Error:', error);
//       return { success: false, error: error.message };
//     }
//   }

//   // Logout user
//   static async logoutUser() {
//     try {
//       await OneSignal.logout();
//       console.log('OneSignal Logout Success');
//     } catch (error) {
//       console.error('OneSignal Logout Error:', error);
//     }
//   }

//   // Get user status
//   static async getUserStatus() {
//     try {
//       const externalId = await OneSignal.User.getExternalId();
//       const onesignalId = await OneSignal.User.getOnesignalId();
//       const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
//       const token = await OneSignal.User.pushSubscription.getTokenAsync();
//       const optedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
      
//       return {
//         externalId,
//         onesignalId,
//         subscriptionId,
//         token: token ? 'Available' : 'Not available',
//         isSubscribed: optedIn
//       };
//     } catch (error) {
//       console.error('Error getting user status:', error);
//       return null;
//     }
//   }

//   // Add tags to user
//   static async addTags(tags) {
//     try {
//       await OneSignal.User.addTags(tags);
//       console.log('Tags added successfully:', tags);
//     } catch (error) {
//       console.error('Error adding tags:', error);
//     }
//   }

//   // Remove tags
//   static async removeTags(keys) {
//     try {
//       await OneSignal.User.removeTags(keys);
//       console.log('Tags removed successfully:', keys);
//     } catch (error) {
//       console.error('Error removing tags:', error);
//     }
//   }
// }

// export default OneSignalHelper;