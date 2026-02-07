import { useState, useEffect, createContext, useContext } from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  GithubAuthProvider, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app;
let auth;

try {
  if (typeof window !== 'undefined' || firebaseConfig.apiKey) {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
  } else {
      console.warn("Skipping Firebase auth init (server/build with missing keys)");
  }
} catch (e) {
    console.error("Auth init error:", e);
}

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }

    setPersistence(auth, browserLocalPersistence)
        .catch((error) => console.error("Persistence error:", error));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) {
        alert("Erreur configuration: Firebase non initialisé");
        return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google Login failed", error);
      alert("Erreur connexion Google: " + error.message);
    }
  };

  const loginWithGithub = async () => {
    if (!auth) {
        alert("Erreur configuration: Firebase non initialisé");
        return;
    }
    try {
      await signInWithPopup(auth, githubProvider);
    } catch (error) {
      console.error("GitHub Login failed", error);
      alert("Erreur connexion GitHub: " + error.message);
    }
  };

  const signUpWithEmail = async (email, password) => {
    if (!auth) {
      alert("Erreur configuration: Firebase non initialisé");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Sign up failed", error);
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    if (!auth) {
      alert("Erreur configuration: Firebase non initialisé");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Sign in failed", error);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const updateDisplayName = async (displayName) => {
    if (!auth?.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() || null });
      setUser({ ...auth.currentUser, displayName: displayName.trim() || null });
    } catch (error) {
      console.error("Update display name failed", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login: loginWithGoogle, loginWithGithub, logout, signUpWithEmail, signInWithEmail, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);