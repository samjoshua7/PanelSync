import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorPlay, Tv, UserCog } from "lucide-react";

const COUNTDOWN_SECONDS = 10;

/**
 * Landing page that lets users choose between Display mode (TV) and Admin mode.
 * Auto-selects Display Device after a 10-second countdown.
 */
export default function DeviceSelector() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [hoveredAdmin, setHoveredAdmin] = useState(false);
  const intervalRef = useRef(null);
  const cancelled = useRef(false);

  // Start countdown — auto-navigate to /pair if not cancelled
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (cancelled.current) return;
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          navigate("/pair");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [navigate]);

  const handleDisplay = () => {
    cancelled.current = true;
    clearInterval(intervalRef.current);
    navigate("/pair");
  };

  const handleAdmin = () => {
    cancelled.current = true;
    clearInterval(intervalRef.current);
    navigate("/login");
  };

  // SVG circle countdown ring
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = countdown / COUNTDOWN_SECONDS;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }}
        />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-16 animate-fade-in-up">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-purple-500/30">
          <MonitorPlay size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Panel<span className="text-purple-400">Sync</span>
          </h1>
          <p className="text-xs text-gray-500">Digital Signage Platform</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-12 animate-fade-in-up delay-100">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Select Device Mode
        </h2>
        <p className="text-gray-400 text-sm md:text-base">
          How is this device being used?
        </p>
      </div>

      {/* Cards */}
      <div className="flex flex-col sm:flex-row gap-6 px-6 w-full max-w-xl animate-fade-in-up delay-200">
        {/* Display Device Card */}
        <button
          onClick={handleDisplay}
          className="device-card flex-1 relative group"
          aria-label="Display Device — TV mode"
        >
          <div className="device-card-inner display-card">
            {/* Countdown ring */}
            <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
              <svg
                width="96"
                height="96"
                viewBox="0 0 96 96"
                className="absolute inset-0 -rotate-90"
              >
                {/* Track */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="#1e3a5f"
                  strokeWidth="4"
                />
                {/* Progress arc */}
                {!cancelled.current && (
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke="url(#countdownGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                )}
                <defs>
                  <linearGradient id="countdownGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="relative z-10 flex flex-col items-center">
                <Tv size={28} className="text-blue-400 mb-1" />
                <span className="text-lg font-bold text-white leading-none">{countdown}</span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Display Device</h3>
            <p className="text-sm text-gray-400 text-center">
              TV, monitor or kiosk showing media
            </p>

            {/* Auto-select badge */}
            <div className="mt-4 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
              Auto-selecting in {countdown}s
            </div>
          </div>
        </button>

        {/* Admin Device Card */}
        <button
          onClick={handleAdmin}
          onMouseEnter={() => setHoveredAdmin(true)}
          onMouseLeave={() => setHoveredAdmin(false)}
          className="device-card flex-1"
          aria-label="Admin Device — manage screens"
        >
          <div className={`device-card-inner admin-card ${hoveredAdmin ? "admin-card-hover" : ""}`}>
            <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-[#1a1a2e] border-2 border-[#333] flex items-center justify-center group-hover:border-purple-500 transition-colors">
              <UserCog size={40} className="text-purple-400" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Admin Device</h3>
            <p className="text-sm text-gray-400 text-center">
              Manage environments, screens &amp; media
            </p>

            <div className="mt-4 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Login required
            </div>
          </div>
        </button>
      </div>

      {/* Footer */}
      <p className="mt-16 text-gray-600 text-xs animate-fade-in-up delay-300">
        Built with ❤️ by Sam Joshua
      </p>
    </div>
  );
}
