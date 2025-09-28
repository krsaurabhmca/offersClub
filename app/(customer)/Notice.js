import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Platform, StyleSheet, Text, View } from 'react-native';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function PushNotificationScreen() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => {
        if (token) {
          console.log("Push token obtained:", token);
          setExpoPushToken(token);
        }
      })
      .catch(err => console.error("Error getting push token:", err));

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        console.log("Notification received:", notification);
        setNotification(notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log("Notification response:", response);
      }
    );

    // Clean up
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Test local notification
  const sendLocalNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Local Test",
          body: "This is a local test notification",
          data: { data: 'goes here' },
        },
        trigger: { seconds: 2 },
      });
      console.log("Local notification scheduled");
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Push Notification Demo</Text>
      
      <View style={styles.tokenContainer}>
        <Text style={styles.labelText}>Your Push Token:</Text>
        <Text selectable={true} style={styles.tokenText}>{expoPushToken || "No token yet"}</Text>
      </View>
      
      {notification && (
        <View style={styles.notificationContainer}>
          <Text style={styles.labelText}>Last Notification:</Text>
          <Text>{notification.request.content.title}</Text>
          <Text>{notification.request.content.body}</Text>
        </View>
      )}
      
      <Button title="Send Local Notification" onPress={sendLocalNotification} />
    </View>
  );
}

// Function to get push notification permissions and token
async function registerForPushNotificationsAsync() {
  let token;

  if (!Device.isDevice) {
    Alert.alert(
      "Simulator Detected", 
      "Push notifications don't work on simulators/emulators. Please use a physical device."
    );
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        "Permission Required",
        "Push notifications need permission to work properly"
      );
      return null;
    }
    
    // Get project ID from app.json/app.config.js
    // You MUST set up an EAS project and have a valid projectId
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.warn("No EAS Project ID found! Push notifications require a valid project ID");
      Alert.alert(
        "Configuration Error", 
        "This app isn't properly configured for push notifications. Contact the developer."
      );
      return null;
    }
    
    // Get push token
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId
    })).data;
    
    // Set up Android notification channel
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    return token;
  } catch (error) {
    console.error("Push notification setup error:", error);
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  tokenContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  notificationContainer: {
    width: '100%',
    backgroundColor: '#e6f7ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  labelText: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tokenText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  }
});