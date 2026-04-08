import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EnvironmentDetail from "./pages/EnvironmentDetail";
import TvPairing from "./pages/TvPairing";
import Slideshow from "./pages/Slideshow";

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Admin Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/environments/:envId" element={<ProtectedRoute><EnvironmentDetail /></ProtectedRoute>} />
        
        {/* TV Screen Routes (Public initially, pairs to env) */}
        <Route path="/pair" element={<TvPairing />} />
        <Route path="/screen/:screenId" element={<Slideshow />} />
        
        {/* Default redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
};

export default App;
