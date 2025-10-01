import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { LogLevel, OneSignal } from "react-native-onesignal";

export default function RootLayout() {
  // Event handler references को store करने के लिए useRef का उपयोग करें
  const foregroundHandlerRef = useRef(null);
  const clickHandlerRef = useRef(null);

  useEffect(() => {
    console.log("Initializing OneSignal...");

    // Enable verbose logging for debugging
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    // Initialize with your OneSignal App ID
    OneSignal.initialize("765e6328-c485-45de-86ff-ba9e022511b1");

    // Use this method to prompt for push notifications
    OneSignal.Notifications.requestPermission(true);

    // Define event handlers with named functions और references store करें
    const foregroundHandler = (event) => {
      console.log("OneSignal: notification will display:", event);
      // Display notification
      event.preventDefault();
      event.getNotification().display();
    };

    const clickHandler = (event) => {
      console.log("OneSignal: notification clicked:", event);
      // Handle click event
    };

    // Store references
    foregroundHandlerRef.current = foregroundHandler;
    clickHandlerRef.current = clickHandler;

    // Add event listeners
    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      foregroundHandler
    );
    OneSignal.Notifications.addEventListener("click", clickHandler);

    // Cleanup function
    return () => {
      console.log("Cleaning up OneSignal event listeners");
      // Individual listeners को remove करें
      if (foregroundHandlerRef.current) {
        OneSignal.Notifications.removeEventListener(
          "foregroundWillDisplay",
          foregroundHandlerRef.current
        );
      }

      if (clickHandlerRef.current) {
        OneSignal.Notifications.removeEventListener(
          "click",
          clickHandlerRef.current
        );
      }
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="(merchant)" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="merchant" />
        <Stack.Screen name="nearby-merchants" />
        <Stack.Screen name="offers" />
        <Stack.Screen name="qr-payment" />
        <Stack.Screen name="transaction-history" />
      </Stack>
    </>
  );
}
