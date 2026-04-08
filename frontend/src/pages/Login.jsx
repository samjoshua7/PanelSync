import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { MonitorPlay } from "lucide-react";
import toast from "react-hot-toast";
import Spinner from "../components/Spinner";

export default function Login() {
  const { currentUser, loginWithGoogle, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (!loading && currentUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <Spinner size={32} className="text-purple-400" />
      </div>
    );
  }

  // If already authenticated and not loading, we'll navigate via useEffect,
  // but we can return null here to avoid rendering the form.
  if (currentUser) return null;

  const handleLogin = async () => {
    if (isLoggingIn) return; // Prevent double-click
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      // Verbose logging for debugging the "not working" issue
      console.error("[Login] Google sign-in full error:", err);
      console.error("[Login] Error Code:", err.code);
      console.error("[Login] Error Message:", err.message);

      if (err.code === "auth/unauthorized-domain") {
        toast.error("Error: This domain (localhost or your URL) is not whitelisted in the Firebase Console.", { duration: 6000 });
      } else if (err.code === "auth/popup-blocked") {
        toast.error("Login popup was blocked by your browser. Please enable popups.");
      } else if (err.code !== "auth/popup-closed-by-user") {
        toast.error(`Sign-in failed: ${err.message || "Unknown error"}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050508] text-white relative overflow-hidden px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 mb-4">
            <MonitorPlay size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Panel<span className="text-purple-400">Sync</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-[#111114] border border-[#222] rounded-2xl p-8 shadow-2xl animate-fade-in-up delay-100">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-gray-400 text-sm mb-8">
            Sign in to manage your screens and environments.
          </p>

          <button
            id="google-login-btn"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors font-semibold text-sm disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoggingIn ? (
              <>
                <Spinner size={18} className="text-gray-600" />
                Signing in...
              </>
            ) : (
              <>
                {/* Google icon */}
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Looking for Display mode?{" "}
          <a href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
            Go back
          </a>
        </p>
      </div>
    </div>
  );
}
