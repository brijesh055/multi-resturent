import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getFirestore }  from "firebase/firestore";
import { getStorage }    from "firebase/storage";

const firebaseConfig = {
  apiKey:            "AIzaSyD-n0YX63SRQH4qB_nK3l6bz93QpkcLNh0",
  authDomain:        "nepalbite-30c26.firebaseapp.com",
  projectId:         "nepalbite-30c26",
  storageBucket:     "nepalbite-30c26.firebasestorage.app",
  messagingSenderId: "575491632360",
  appId:             "1:575491632360:web:4eeb936aab00e6d7dd2d5d"
};

const app = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
