// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvPOuD6qCZo7yIg9MZRShs7IQp_bEIY9Q",
  authDomain: "lineupmaker-73eba.firebaseapp.com",
  projectId: "lineupmaker-73eba",
  storageBucket: "lineupmaker-73eba.firebasestorage.app",
  messagingSenderId: "103482018340",
  appId: "1:103482018340:web:360e48137ab89ae62ea6b1",
  measurementId: "G-9L5SFGLQV9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);