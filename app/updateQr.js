import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";
const { width } = Dimensions.get("window");

export default function updateQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [validating, setValidating] = useState(false);

  // ✅ Validate if QR code is a UPI QR format
  const isValidUPI = (data: string) => {
    try {
      // Example UPI format: upi://pay?pa=merchant@upi&pn=MerchantName&am=100&cu=INR
      if (data.startsWith("upi://pay")) {
        const url = new URL(data);
        const pa = url.searchParams.get("pa"); // Payee Address
        const pn = url.searchParams.get("pn"); // Payee Name
        return pa && pn ? true : false;
      }
      return false;
    } catch {
      return false;
    }
  };

  // ✅ Extract Merchant QR or UPI ID
  const extractUPI = (data: string) => {
    try {
      const url = new URL(data);
      //return url.searchParams.get("pa");
      if(url.searchParams.get("pa"))
        {
          return url;  
        } // Merchant VPA (UPI ID)
    } catch {
      return null;
    }
  };


// ✅ Update merchant QR code API
const updateMerchantQR = async (upiId: string) => {
  try {
    const merchantId = await AsyncStorage.getItem("merchant_id");

    if (!merchantId) {
      Alert.alert("Error", "Merchant ID not found. Please login again.");
      setScanned(false);
      return;
    }

    setValidating(true);

    const response = await axios.post(
      "https://offersclub.offerplant.com/opex/api.php?task=update_merchant_profile",
      { qr_code: upiId, id: merchantId }
    );
    console.log("Update QR Response:", response.data);
    if (response.data?.status === "success") {
      Alert.alert("✅ QR Updated", "Merchant QR code updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert(
        "Update Failed",
        response.data?.message || "Something went wrong!"
      );
      setScanned(false);
    }
  } catch (error) {
    console.error("Merchant QR update error:", error);
    Alert.alert("Error", "Failed to update merchant QR. Try again.");
    setScanned(false);
  } finally {
    setValidating(false);
  }
};


  // ✅ Handle scanned QR
  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || validating) return;

    setScanned(true);
    Vibration.vibrate(100);

    if (!isValidUPI(data)) {
      Alert.alert("❌ Invalid QR Code", "Please scan a valid UPI QR Code.", [
        { text: "Try Again", onPress: () => setScanned(false) },
      ]);
      return;
    }

    const upiId = extractUPI(data);
    if (!upiId) {
      Alert.alert("Error", "Unable to extract UPI ID from QR code.", [
        { text: "Try Again", onPress: () => setScanned(false) },
      ]);
      return;
    }

    // Confirm update
    Alert.alert(
      "Confirm Update",
      `Do you want to update New merchant QR `, //to:\n\n${upiId}?
      [
        { text: "Cancel", style: "cancel", onPress: () => setScanned(false) },
        {
          text: "Yes, Update",
          onPress: async () => {
            await updateMerchantQR(upiId);
          },
        },
      ]
    );
  };

  // Permissions UI
  if (!permission) {
    return (
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>Checking permissions...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>
            Camera permission is required to scan QR codes.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        torch={torchOn ? "on" : "off"}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      >
        {/* Header */}
        <LinearGradient
          colors={["rgba(0,0,0,0.8)", "transparent"]}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan UPI QR</Text>
          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => setTorchOn((prev) => !prev)}
          >
            <Text style={styles.flashButtonText}>{torchOn ? "🔦" : "💡"}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Scanning Area */}
        <View style={styles.scanningArea}>
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {validating && (
                <View style={styles.validatingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.validatingText}>
                    Updating Merchant QR...
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.footer}
        >
          <Text style={styles.instructionText}>
            Position the UPI QR inside the frame
          </Text>
          <Text style={styles.subInstructionText}>
            Only valid UPI QR codes are accepted
          </Text>

          {scanned && !validating && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </CameraView>
    </View>
  );
}

// ✅ Styles (same as before)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  permissionText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: { flex: 1 },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  title: {
    flex: 2,
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  flashButton: { flex: 1, alignItems: "flex-end" },
  flashButtonText: { fontSize: 24 },
  scanningArea: { flex: 1, justifyContent: "center", alignItems: "center" },
  scannerOverlay: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: "100%",
    height: "100%",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#fff",
    borderWidth: 4,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: "auto",
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: "auto",
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: "auto",
    left: "auto",
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  validatingOverlay: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  validatingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: { padding: 30, alignItems: "center" },
  instructionText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },
  subInstructionText: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  rescanButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  rescanButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
