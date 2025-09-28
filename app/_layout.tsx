import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  
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