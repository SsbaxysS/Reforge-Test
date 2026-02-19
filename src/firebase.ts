import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAVF1Gi0DZ0zeKE81hxvqCCkkiktLOmv9U",
  authDomain: "reforge-test.firebaseapp.com",
  databaseURL: "https://reforge-test-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "reforge-test",
  storageBucket: "reforge-test.firebasestorage.app",
  messagingSenderId: "993447936798",
  appId: "1:993447936798:web:897f09505e1a8ff2f5bf0f",
  measurementId: "G-C8R8BP70VM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
