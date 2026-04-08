import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

    // Handle the result of a Google sign-in redirect
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("[AuthContext] Redirect login success:", result.user.email);
        }
      } catch (err) {
        // Only log errors if it's not the initial load or a non-auth error
        if (err.code !== "auth/network-request-failed") {
          console.error("[AuthContext] Redirect login failed:", err.code, err.message);
        }
      }
    };
    handleRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // Clear any existing interval when auth state changes
      if (refreshInterval) clearInterval(refreshInterval);

      if (user) {
        try {
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
        } catch (err) {
          console.error("[AuthContext] Error getting initial token:", err);
        }
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
    // Use Popup as primary (requested), Redirect as fallback if needed
    return signInWithPopup(auth, provider).catch((err) => {
      // Fallback to redirect only if popup is blocked or specifically fails due to environment
      if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
        console.warn("[AuthContext] Popup blocked, falling back to redirect...");
        return signInWithRedirect(auth, provider);
      }
      throw err;
    });
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
