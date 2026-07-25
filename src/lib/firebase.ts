import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBSRrmol6HkekNpATVIH4NrVBZQfovSL5g",
  authDomain: "student-result-extractor.firebaseapp.com",
  projectId: "student-result-extractor",
  storageBucket: "student-result-extractor.firebasestorage.app",
  messagingSenderId: "835969367322",
  appId: "1:835969367322:web:fa3e7157ebed7e8e15c0a3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutFirebase() {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { FirebaseUser };
