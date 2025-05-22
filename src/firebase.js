import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBR-Qgc438sjKnNKNA025riy2prtUZGQWc",
  authDomain: "naqt-quizbowl-app.firebaseapp.com",
  projectId: "naqt-quizbowl-app",
  storageBucket: "naqt-quizbowl-app.appspot.com",
  messagingSenderId: "277915776332",
  appId: "1:277915776332:web:b312a54ba746c0e4a38be9",
  measurementId: "G-6149BM4ZH1"
};

let app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
setLogLevel('debug');

export { app, analytics, auth, db, signInAnonymously, signInWithCustomToken, onAuthStateChanged };
const analytics = getAnalytics(app);