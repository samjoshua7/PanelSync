import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MonitorPlay, LogOut, Menu, X, LayoutDashboard } from "lucide-react";

/**
 * Fixed top Navbar for Admin pages.
 * Shows: Logo | Nav Links | User email + Logout
 * Mobile: Hamburger menu with slide-down drawer
 */
export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#222] flex items-center px-4 md:px-8">
        {/* Left: Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <MonitorPlay size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">
            Panel<span className="text-purple-400">Sync</span>
          </span>
        </Link>

        {/* Desktop: Nav links */}
        <div className="hidden md:flex items-center gap-6 mr-6">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LayoutDashboard size={15} />
            Dashboard
          </Link>
        </div>

        {/* Desktop: User info + logout */}
        {currentUser && (
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {currentUser.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs text-gray-300 max-w-[160px] truncate">
                {currentUser.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Mobile: Hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="fixed top-16 left-0 right-0 z-30 bg-[#0f0f0f] border-b border-[#222] p-4 flex flex-col gap-3 animate-slide-down md:hidden">
          <Link
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white py-2 px-3 rounded-lg hover:bg-[#1a1a1a] transition-colors"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          {currentUser && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {currentUser.email?.[0]?.toUpperCase()}
                </div>
                {currentUser.email}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 py-2 px-3 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
