import React, { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { MonitorPlay, Copy, RefreshCw, Check } from "lucide-react";
import toast from "react-hot-toast";
import Spinner from "../components/Spinner";

const CODE_EXPIRY_SECONDS = 120; // 2 minutes matches backend

// LocalStorage keys for permanent device identity
const LS_PERMANENT_ID = "ps_permanentId";
const LS_SCREEN_ID    = "ps_screenId";

export default function TvPairing() {
  const [pairingData, setPairingData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [expiryCountdown, setExpiryCountdown] = useState(CODE_EXPIRY_SECONDS);
  const navigate = useNavigate();
  const pollingRef = useRef(null);
  const expiryRef = useRef(null);
  // Guard: ensures auto-reconnect via permanentId fires at most once per mount
  const autoConnectTriedRef = useRef(false);

  // Generate a pairing code and start polling
  const generateCodeAndPoll = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setIsCopied(false);

    // Clear any existing intervals
    clearInterval(pollingRef.current);
    clearInterval(expiryRef.current);

    try {
      const data = await api.generatePairingCode();
      setPairingData(data);
      setExpiryCountdown(CODE_EXPIRY_SECONDS);

      // Expiry countdown timer
      expiryRef.current = setInterval(() => {
        setExpiryCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(expiryRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Poll every 2.5s to check if admin paired the screen
      pollingRef.current = setInterval(async () => {
        try {
          const status = await api.checkPairingStatus(data.codeId);
          if (status.linkedScreenId) {
            clearInterval(pollingRef.current);
            clearInterval(expiryRef.current);
            // Store permanent identity so TV auto-reconnects on reload
            if (status.permanentId) {
              localStorage.setItem(LS_PERMANENT_ID, status.permanentId);
            }
            localStorage.setItem(LS_SCREEN_ID, status.linkedScreenId);
            navigate(`/screen/${status.linkedScreenId}`);
          }
        } catch {
          // Silently ignore polling errors — keep retrying
        }
      }, 2500);
    } catch (err) {
      console.error("Failed to generate pairing code", err);
      toast.error("Failed to get pairing code. Retrying...");
      setTimeout(() => generateCodeAndPoll(), 5000);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, navigate]);

  useEffect(() => {
    // ── Permanent ID auto-reconnect ─────────────────────────────────────────
    // If this TV was previously paired and has a stored screenId, go straight
    // to the slideshow. Slideshow handles the "Screen not found" case and
    // will clear localStorage if the admin removed the screen.
    //
    // Uses a retry helper to guard against the async race between localStorage
    // reads and Firebase initialisation on first load.
    if (autoConnectTriedRef.current) return;
    autoConnectTriedRef.current = true;

    const existingScreenId = localStorage.getItem(LS_SCREEN_ID);

    if (existingScreenId) {
      // Retry up to 2 times (1.5 s apart) in case the router isn't ready yet
      const autoConnect = (retries = 2) => {
        try {
          navigate(`/screen/${existingScreenId}`);
        } catch (err) {
          console.warn("[TvPairing] Auto-connect attempt failed:", err.message);
          if (retries > 0) {
            setTimeout(() => autoConnect(retries - 1), 1500);
          }
        }
      };
      // Defer one tick so React Router is fully mounted before navigation
      setTimeout(() => autoConnect(), 0);
      return;
    }

    generateCodeAndPoll();
    return () => {
      clearInterval(pollingRef.current);
      clearInterval(expiryRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle code refresh
  const handleRefresh = () => {
    generateCodeAndPoll();
  };

  // Copy code to clipboard
  const handleCopy = async () => {
    if (!pairingData?.code || isCopied) return;
    try {
      await navigator.clipboard.writeText(pairingData.code);
      setIsCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      toast.error("Could not copy — please copy manually.");
    }
  };

  // Expiry progress percentage
  const expiryPercent = (expiryCountdown / CODE_EXPIRY_SECONDS) * 100;
  const isExpired = expiryCountdown === 0;

  return (
    <div className="min-h-screen bg-[#020204] text-white flex flex-col items-center justify-between p-8">
      {/* Top: Logo */}
      <div className="flex items-center gap-3 mt-4 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <MonitorPlay size={20} className="text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight">
          Panel<span className="text-purple-400">Sync</span>
        </span>
      </div>

      {/* Center: Code card */}
      <div className="flex flex-col items-center w-full max-w-md animate-fade-in-up delay-100">
        <p className="text-gray-400 text-lg mb-2 text-center">
          Enter this code in your dashboard
        </p>
        <p className="text-gray-600 text-sm mb-10 text-center">
          Open PanelSync Admin → Environment → Pair Screen
        </p>

        {/* Big code display */}
        <div className="w-full bg-[#0c0c10] border border-[#222] rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-5 rounded-3xl"
            style={{ background: "radial-gradient(circle at 50% 50%, #a855f7, transparent 70%)" }}
          />

          {isGenerating && !pairingData ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Spinner size={36} className="text-purple-400" />
              <p className="text-gray-400 text-sm">Generating code...</p>
            </div>
          ) : (
            <>
              {/* Code */}
              <div className={`text-7xl font-mono tracking-[0.4em] font-bold pl-4 transition-opacity ${isExpired ? "opacity-30" : "text-white"}`}>
                {pairingData?.code ?? "------"}
              </div>

              {isExpired && (
                <p className="text-yellow-400 text-sm mt-3 font-medium">Code expired — refresh to get a new one</p>
              )}

              {/* Expiry progress bar */}
              {!isExpired && (
                <div className="mt-6 w-full">
                  <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                    <span>Expires in</span>
                    <span className={expiryCountdown <= 30 ? "text-yellow-400" : "text-gray-400"}>
                      {Math.floor(expiryCountdown / 60)}:{String(expiryCountdown % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${expiryPercent}%`,
                        background: expiryPercent > 50
                          ? "linear-gradient(90deg, #3b82f6, #a855f7)"
                          : expiryPercent > 20
                            ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                            : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  id="copy-code-btn"
                  onClick={handleCopy}
                  disabled={isExpired || isCopied || isGenerating}
                  className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-blue-500/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40"
                >
                  {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  {isCopied ? "Copied!" : "Copy Code"}
                </button>
                <button
                  id="refresh-code-btn"
                  onClick={handleRefresh}
                  disabled={isGenerating}
                  className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-purple-500/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40"
                >
                  {isGenerating ? <Spinner size={16} /> : <RefreshCw size={16} />}
                  {isGenerating ? "Refreshing..." : "New Code"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Waiting indicator */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
            Looking for admin...
          </div>
          <p className="text-xs text-gray-700 italic">Waiting to link with your account</p>
        </div>

        {/* Link to Login for lost users */}
        <div className="mt-12">
          <a
            href="/login"
            className="text-xs text-gray-600 hover:text-purple-400 border border-gray-800 hover:border-purple-500/50 rounded-lg px-4 py-2 transition-all"
          >
            Looking for Admin Login?
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="text-gray-700 text-xs text-center pb-4">
        Built with ❤️ by Sam Joshua
      </div>
    </div>
  );
}
