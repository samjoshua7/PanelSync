import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    let refreshInterval;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // Clear any existing interval when auth state changes
      if (refreshInterval) clearInterval(refreshInterval);

      if (user) {
        const freshToken = await user.getIdToken();
        setToken(freshToken);

        // Auto-refresh token every 55 minutes
        refreshInterval = setInterval(async () => {
          try {
            const refreshed = await user.getIdToken(true);
            setToken(refreshed);
            console.debug("[AuthContext] Token auto-refreshed.");
          } catch (err) {
            console.error("[AuthContext] Token refresh failed:", err);
          }
        }, 55 * 60 * 1000);
      } else {
        setToken(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  const value = {
    currentUser,
    token,
    loading,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Render children immediately — ProtectedRoute handles its own loading state */}
      {children}
    </AuthContext.Provider>
  );
};
