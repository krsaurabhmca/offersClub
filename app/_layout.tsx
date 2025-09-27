import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Handle initial URL when app is opened from deep link
    const handleInitialURL = async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        handleDeepLink(initialURL);
      }
    };

    // Handle URLs when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    const handleDeepLink = (url) => {
      try {
        // Handle both app scheme and web URLs
        let parsed;
        
        if (url.startsWith('offersclub://')) {
          // App scheme: offersclub://profile?qr_code=xxx
          parsed = Linking.parse(url);
        } else if (url.includes('offersclub.offerplant.com')) {
          // Web URL: https://offersclub.offerplant.com/profile.php?qr_code=xxx
          const urlObj = new URL(url);
          parsed = {
            path: urlObj.pathname.replace('.php', '').replace('/', ''),
            queryParams: Object.fromEntries(urlObj.searchParams)
          };
        }

        if (parsed) {
          if (parsed.path === 'profile' && parsed.queryParams?.qr_code) {
            // Navigate to merchant page with qr_code param
            router.push({
              pathname: '/merchant',
              params: { qr_code: parsed.queryParams.qr_code },
            });
          }
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    handleInitialURL();

    return () => {
      subscription?.remove();
    };
  }, [router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="qr-scanner" />
        <Stack.Screen name="qr-payment" />
        <Stack.Screen name="merchant" />
      </Stack>
    </>
  );
}