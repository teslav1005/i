// إعدادات Firebase ومفاتيح API
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC89TJmlrtfh88o_HDgCHD42hAvXMZ6FQM",
  authDomain: "afnan-49d21.firebaseapp.com",
  projectId: "afnan-49d21",
  storageBucket: "afnan-49d21.appspot.com",
  messagingSenderId: "886430112619",
  appId: "1:886430112619:web:278b9ea777f4dda77b0a2e",
  measurementId: "G-EWMJ8ZPY7X"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, firebaseConfig };
