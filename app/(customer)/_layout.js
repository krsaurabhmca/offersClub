import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

const _layout = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#5f27cd",
        tabBarInactiveTintColor: "#95a5a6",
        tabBarStyle: {
          backgroundColor: "#fff",
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
          marginTop: 3,
        },
        tabBarIconStyle: { marginTop: 3 },
        headerShown: false,
      }}
    >
      {/* --- Home --- */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.activeIconContainer,
              ]}
            >
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={focused ? "#fff" : color}
              />
            </View>
          ),
        }}
      />

      {/* --- Center QR --- */}
      <Tabs.Screen
        name="qr-scanner"
        options={{
          title: "Scan",
          tabBarIcon: () => (
            <View style={styles.centerIconContainer}>
              <LinearGradient
                colors={["#6c5ce7", "#5f27cd", "#341f97"]}
                style={styles.centerIconInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={34}
                  color="#fff"
                />
              </LinearGradient>
              <View style={styles.centerIconGlow} />
            </View>
          ),
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "700",
            marginTop: -6,
            color: "#5f27cd",
          },
        }}
      />

      {/* --- History --- */}
      <Tabs.Screen
        name="transaction-history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.activeIconContainer,
              ]}
            >
              <Ionicons
                name={focused ? "time" : "time-outline"}
                size={22}
                color={focused ? "#fff" : color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
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
    backgroundColor: "#5f27cd",
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
    shadowColor: "#5f27cd",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    borderWidth: 4,
    borderColor: "#fff",
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
