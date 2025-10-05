import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { LogLevel, OneSignal } from "react-native-onesignal";

export default function RootLayout() {
  const router = useRouter(); // expo-router navigation

  // Refs for event handlers
  const foregroundHandlerRef = useRef(null);
  const clickHandlerRef = useRef(null);

  useEffect(() => {
    console.log("Initializing OneSignal...");

    // Enable verbose logging (debugging)
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    // Initialize OneSignal with your App ID
    OneSignal.initialize("c326b200-d8f3-4fae-99c8-a39b0d8becd0");

    // Prompt for push notification permission (iOS only)
    OneSignal.Notifications.requestPermission(true);

    // Handler: When notification received in foreground
    const foregroundHandler = (event) => {
      console.log("OneSignal: notification will display:", event);
      event.preventDefault(); // stop auto-display
      event.getNotification().display(); // show it manually
    };

    // Handler: When user clicks notification
    const clickHandler = (event) => {
      console.log("OneSignal: notification clicked:", event);

      const data = event.notification.additionalData;
      console.log("Notification Data:", data);

      // Example: Navigate based on notification data
      if (data?.screen) {
        // Pass params if available
        router.push({
          pathname: data.screen,
          params: data, // send entire payload
        });
      } else {
        // Default: Go to offers page
        router.push("/dashboard");
      }
    };

    // Store refs
    foregroundHandlerRef.current = foregroundHandler;
    clickHandlerRef.current = clickHandler;

    // Add listeners
    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      foregroundHandler
    );
    OneSignal.Notifications.addEventListener("click", clickHandler);

    // Cleanup listeners on unmount
    return () => {
      console.log("Cleaning up OneSignal event listeners");

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
      </Stack>
    </>
  );
}
