import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import Spinner from "./components/Spinner";
import CustomToast from "./components/Toast";

// Pages
import DeviceSelector from "./pages/DeviceSelector";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EnvironmentDetail from "./pages/EnvironmentDetail";
import TvPairing from "./pages/TvPairing";
import Slideshow from "./pages/Slideshow";

/**
 * Protected route wrapper.
 * Shows a spinner while Firebase resolves the auth state,
 * then redirects to /login if unauthenticated.
 */
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <Spinner size={32} className="text-purple-400" />
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

const App = () => {
  return (
    <Router>
      {/* Global toast notifications — bottom-left, custom design */}
      <Toaster
        position="bottom-left"
        toastOptions={{ duration: 3000 }}
      >
        {(t) => <CustomToast t={t} />}
      </Toaster>

      <Routes>
        {/* Landing — Device Selector (Display vs Admin) */}
        <Route path="/" element={<DeviceSelector />} />

        {/* Admin Auth */}
        <Route path="/login" element={<Login />} />

        {/* Admin Routes — protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/environments/:envId"
          element={
            <ProtectedRoute>
              <EnvironmentDetail />
            </ProtectedRoute>
          }
        />

        {/* TV / Display Routes — public */}
        <Route path="/pair" element={<TvPairing />} />
        <Route path="/screen/:screenId" element={<Slideshow />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
