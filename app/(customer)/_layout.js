import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Color palette
const COLORS = {
  primary: "#5f27cd",
  gradientStart: "#6c5ce7",
  gradientMid: "#5f27cd",
  gradientEnd: "#341f97",
  inactive: "#95a5a6",
  background: "#fff",
  white: "#fff",
};

const TabIcon = ({ name, color, size = 24, focused }: any) => (
  <View
    style={[
      styles.iconContainer,
      focused && styles.activeIconContainer,
    ]}
  >
    <Ionicons name={name} size={size} color={focused ? COLORS.white : color} />
  </View>
);

// Exclusive center QR scan floating button
const CenterScanIcon = () => (
  <View style={styles.centerIconContainer}>
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
      style={styles.centerIconInner}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <MaterialCommunityIcons name="qrcode-scan" size={34} color="#fff" />
    </LinearGradient>
    <View style={styles.centerIconGlow} />
  </View>
);

const _layout = () => {
  return (
   <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.inactive,
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopWidth: 0,
            elevation: 25,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            height: 80,
            paddingBottom: 10,
            paddingTop: 5,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 7,
          },
          tabBarIconStyle: { marginTop: 3 },
          headerShown: false,
        }}
      >

        {/* Home Tab */}
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) =>
              TabIcon({ name: focused ? "home" : "home-outline", color, focused }),
          }}
        />

        {/* Nearby Merchants Tab */}
        <Tabs.Screen
          name="nearby-merchants"
          options={{
            title: "Nearby Shops",
            tabBarIcon: ({ color, focused }) =>
              TabIcon({
                name: focused ? "storefront" : "storefront-outline",
                color,
                focused,
                size: 24,
              }),
          }}
        />

        {/* QR Scanner Tab (Only Big Center Button) */}
        <Tabs.Screen
          name="qr-scanner"
          options={{
            title: "Scan",
            tabBarIcon: CenterScanIcon,
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: "700",
              marginTop: -6,
              color: COLORS.primary,
            },
          }}
        />

        {/* History */}
        <Tabs.Screen
          name="transaction-history"
          options={{
            title: "History",
            tabBarIcon: ({ color, focused }) =>
              TabIcon({
                name: focused ? "time" : "time-outline",
                color,
                focused,
                size: 22,
              }),
          }}
        />

        {/* Profile */}
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) =>
              TabIcon({
                name: focused ? "person" : "person-outline",
                color,
                focused,
                size: 22,
              }),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
};

export default _layout;

const styles = StyleSheet.create({
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  activeIconContainer: {
    backgroundColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  // Center QR Button
  centerIconContainer: {
    position: "relative",
    top: -28,
    justifyContent: "center",
    alignItems: "center",
  },
  centerIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    elevation: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    borderWidth: 4,
    borderColor: COLORS.background,
  },
  centerIconGlow: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 40,
    backgroundColor: "rgba(95, 39, 205, 0.12)",
    zIndex: -1,
  },
});