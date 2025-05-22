import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAsMgYF2t1ob3XXBtWrrx13eAJCaYzEZco",
  authDomain: "smellanalyzer.firebaseapp.com",
  projectId: "smellanalyzer",
  storageBucket: "smellanalyzer.firebasestorage.app",
  messagingSenderId: "344234558936",
  appId: "1:344234558936:web:952fde860f8d940f7f5ead"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);