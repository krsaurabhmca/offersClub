// firebase.js

import { initializeApp } from "firebase/app";
// Analytics को React Native में अलग तरह से इम्पोर्ट करना होता है
// getAnalytics वेब के लिए है, React Native में काम नहीं करेगा

// Firebase कॉन्फिगरेशन
const firebaseConfig = {
  apiKey: "AIzaSyAGbswd5L4ylBxsLyo5XgPFHkLRvOLQZRE",
  authDomain: "offersclub-dfbea.firebaseapp.com",
  projectId: "offersclub-dfbea",
  storageBucket: "offersclub-dfbea.firebasestorage.app",
  messagingSenderId: "450728044865",
  appId: "1:450728044865:web:79d501130d56b2b00119c0",
  measurementId: "G-KHKW81SQVX"
};

// Firebase इनिशियलाइज़ करें
const app = initializeApp(firebaseConfig);

// अगर आप Analytics चाहते हैं, तो बाद में इसे अलग से इंस्टॉल करके जोड़ सकते हैं
// const analytics = getAnalytics(app); - यह React Native में काम नहीं करेगा

export default app;