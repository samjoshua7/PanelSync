import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { LogIn } from "lucide-react";

export default function Login() {
  const { currentUser, loginWithGoogle } = useAuth();

  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
      <div className="max-w-md w-full p-8 bg-[#1a1a1a] rounded-2xl shadow-2xl border border-[#333]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">PanelSync</h1>
          <p className="text-gray-400">Manage your screens seamlessly</p>
        </div>
        <button
          onClick={loginWithGoogle}
          className="w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-200 transition-colors font-semibold"
        >
          <LogIn size={20} />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
