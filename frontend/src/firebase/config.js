import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB7kZvC03p_a9w8za5p4fdEQq5P3h9vUdg",
  authDomain: "fritterfolio-login.firebaseapp.com",
  projectId: "fritterfolio-login",
  storageBucket: "fritterfolio-login.firebasestorage.app",
  messagingSenderId: "525725976220",
  appId: "1:525725976220:web:886fcff9f482064bef0f59"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db }; 