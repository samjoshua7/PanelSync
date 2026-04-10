import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import MediaViewer from "../components/MediaViewer";
import Watermark from "../components/Watermark";
import { MonitorX, WifiOff, MonitorPlay, Power } from "lucide-react";
import Spinner from "../components/Spinner";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RETRY_DELAY = 15000; // 15 seconds before re-attempting after error
const AUTO_START_SECONDS = 5;

// LocalStorage keys (mirror of TvPairing.jsx)
const LS_PERMANENT_ID = "ps_permanentId";
const LS_SCREEN_ID    = "ps_screenId";

export default function Slideshow() {
  const { screenId } = useParams();
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_START_SECONDS);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  // Disconnect button (Fix 4): hidden by default, shown on mouse move or long-press
  const [showDisconnectBtn, setShowDisconnectBtn] = useState(false);

  const wakeLockRef = useRef(null);
  const retryTimerRef = useRef(null);
  const noSleepVideoRef = useRef(null);
  // Refs for disconnect button hide timer and long-press detection
  const disconnectHideRef = useRef(null);
  const longPressRef = useRef(null);
  const startedRef = useRef(false);

  // ── Activation Handler (Automated or Triggered by click) ──────────────────
  const handleActivate = async () => {
    if (startedRef.current || loading) return;
    startedRef.current = true;
    setIsActivated(true);
    
    // 1. Enter Fullscreen (Best effort — works if triggered by click)
    tryFullscreen();

    // 2. Request Wake Lock (keep screen on)
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("[Slideshow] Wake lock acquired.");
      } catch (err) {
        console.warn("[Slideshow] Wake lock failed:", err.message);
      }
    }

    // 3. Play No-Sleep Video (Legacy fallback for older TVs)
    if (noSleepVideoRef.current) {
      try {
        await noSleepVideoRef.current.play();
        console.log("[Slideshow] No-sleep video activated.");
      } catch (err) {
        console.warn("[Slideshow] No-sleep video failed:", err.message);
      }
    }
  };

  const tryFullscreen = () => {
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen().catch(() => {});
  };

  useEffect(() => {
    const enable = () => {
      tryFullscreen();
      // If we clicked before the countdown finished, let's start it now
      if (!startedRef.current && !loading) {
        handleActivate();
      }
    };
    window.addEventListener("click", enable);
    return () => window.removeEventListener("click", enable);
  }, [loading]);

  // ── Auto-start countdown (5 s → 0 → trigger activation automatically) ─────
  useEffect(() => {
    if (isActivated || loading) return;
    if (countdown <= 0) {
      handleActivate();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isActivated, loading, handleActivate]);

  // ── Re-acquire Wake Lock on visibility change ─────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isActivated) {
        if ("wakeLock" in navigator && !wakeLockRef.current) {
          try {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
          } catch {}
        }
        if (noSleepVideoRef.current && noSleepVideoRef.current.paused) {
          try {
            await noSleepVideoRef.current.play();
          } catch {}
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, [isActivated]);

  // ── Fix 1: Disconnect button visibility (Show on move, hide after 5s) ───
  useEffect(() => {
    const handleMouseMove = () => {
      setShowDisconnectBtn(true);
      clearTimeout(disconnectHideRef.current);
      disconnectHideRef.current = setTimeout(() => {
        setShowDisconnectBtn(false);
      }, 5000);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(disconnectHideRef.current);
    };
  }, []);

  // ── Fullscreen Cleanup ──────────────────────────────────────────────────
  // (Fullscreen is now handled by single-attempt effects and click listener)

  // ── Fix 4: Disconnect action ─────────────────────────────────────────────
  const disconnectDevice = async () => {
    if (!window.confirm("Disconnect this display?")) return;
    try {
      await updateDoc(doc(db, "screens", screenId), {
        status: "offline",
        lastSeen: serverTimestamp(),
      });
    } catch (e) {
      console.warn("[Slideshow] Disconnect update failed:", e.message);
    }
    localStorage.removeItem(LS_PERMANENT_ID);
    localStorage.removeItem(LS_SCREEN_ID);
    navigate("/");
  };

  // ── Online / Offline + Heartbeat ────────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    let heartbeatInterval;
    if (screenId) {
      heartbeatInterval = setInterval(async () => {
        if (navigator.onLine) {
          try {
            await updateDoc(doc(db, "screens", screenId), {
              lastSeen: Date.now(), // Use Date.now() for reliable health system
              status: "online",
            });
          } catch (e) {
            console.warn("[Slideshow] Heartbeat failed:", e.message);
          }
        }
      }, HEARTBEAT_INTERVAL);
    }

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [screenId]);

  // ── Fix 2b: Guard stale currentIndex after slides CRUD ──────────────────
  useEffect(() => {
    if (slides.length > 0 && currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides, currentIndex]);

  // ── Load Slides + Fix 3a: Real-time screen removal detection ────────────
  useEffect(() => {
    if (!screenId) return;

    const cached = localStorage.getItem(`slides_${screenId}`);
    if (cached) {
      try {
        setSlides(JSON.parse(cached));
        setLoading(false);
      } catch {}
    }

    let unsubscribeSlides = () => {};
    let unsubscribeScreen = () => {};

    const setup = async () => {
      try {
        const screenDocRef = doc(db, "screens", screenId);
        const screenSnap = await getDoc(screenDocRef);

        if (!screenSnap.exists()) {
          // Screen was removed by admin — clear stored identity so TV can re-pair
          localStorage.removeItem(LS_PERMANENT_ID);
          localStorage.removeItem(LS_SCREEN_ID);
          setErrorStatus("Screen not found. Please re-pair this device.");
          setLoading(false);
          return;
        }

        // Fix 3a: Watch the screen doc in real-time — if admin removes it
        // while the slideshow is running, stop and send TV back to pairing.
        unsubscribeScreen = onSnapshot(screenDocRef, (snap) => {
          if (!snap.exists()) {
            localStorage.removeItem(LS_PERMANENT_ID);
            localStorage.removeItem(LS_SCREEN_ID);
            setErrorStatus("This screen was removed by the admin.");
            setLoading(false);
            // Give the user a moment to read the message, then redirect
            setTimeout(() => navigate("/"), 3000);
          }
        });

        const { userId, environmentId, envId: envIdField } = screenSnap.data();
        const envId = environmentId || envIdField;

        // Read watermarkEnabled from environment doc
        try {
          const envSnap = await getDoc(doc(db, "environments", envId));
          if (envSnap.exists()) {
            setWatermarkEnabled(envSnap.data().watermarkEnabled !== false);
          }
        } catch { /* non-critical; keep default true */ }

        const q = query(
          collection(db, "environments", envId, "slides"),
          where("userId", "==", userId)
        );

        unsubscribeSlides = onSnapshot(
          q,
          (snapshot) => {
            const slideData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            slideData.sort((a, b) => a.order - b.order);
            setSlides(slideData);
            setLoading(false);
            setErrorStatus(null);
            localStorage.setItem(`slides_${screenId}`, JSON.stringify(slideData));
            setCurrentIndex((prev) => (prev >= slideData.length ? 0 : prev));
          },
          (err) => {
            setErrorStatus(`Connection error: ${err.message}`);
            setLoading(false);
            retryTimerRef.current = setTimeout(() => {
              setErrorStatus(null);
              setLoading(true);
              setup();
            }, RETRY_DELAY);
          }
        );
      } catch (err) {
        setErrorStatus("Failed to connect. Retrying...");
        setLoading(false);
        retryTimerRef.current = setTimeout(() => {
          setErrorStatus(null);
          setLoading(true);
          setup();
        }, RETRY_DELAY);
      }
    };

    setup();

    return () => {
      unsubscribeSlides();
      unsubscribeScreen();
      clearTimeout(retryTimerRef.current);
    };
  }, [screenId, navigate]);

  const handleNextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  // ── UI Rendering ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-gray-600">
        <Spinner size={32} className="text-purple-400 mb-6" />
        <p className="text-lg text-gray-400">Loading presentation...</p>
      </div>
    );
  }

  // Activation Overlay with 5-second auto-start countdown
  if (!isActivated) {
    const countdownPercent = ((AUTO_START_SECONDS - countdown) / AUTO_START_SECONDS) * 100;
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl mb-8 animate-glow-pulse">
          <MonitorPlay size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight">Display Ready</h1>
        <p className="text-gray-400 max-w-sm mb-8 text-lg">
          Tap the button below to start the ad rotation in fullscreen and disable screen sleep.
        </p>

        {/* Auto-start countdown ring */}
        <div className="relative flex items-center justify-center mb-8">
          <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle
              cx="36" cy="36" r="30" fill="none"
              stroke="rgba(168,85,247,0.8)" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 30}`}
              strokeDashoffset={`${2 * Math.PI * 30 * (1 - countdownPercent / 100)}`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span className="absolute text-2xl font-bold text-purple-300">{countdown}</span>
        </div>

        <p className="text-gray-500 text-sm mb-6">Auto-starting in {countdown}s…</p>

        {/* Manual fallback button */}
        <button
          id="launch-display-btn"
          onClick={handleActivate}
          className="bg-white text-black px-12 py-5 rounded-3xl font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          Launch Now
        </button>
        <p className="mt-12 text-xs text-gray-600 font-mono">ID: {screenId}</p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-red-500 p-8 text-center">
        <MonitorX size={56} className="mb-4 opacity-70" />
        <p className="text-xl font-bold">Connection Error</p>
        <p className="text-sm mt-2 opacity-70">{errorStatus}</p>
        <p className="text-xs mt-4 text-gray-600">Auto-retrying shortly...</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-gray-600 p-8 text-center">
        <MonitorX size={56} className="mb-4 opacity-40" />
        <p className="text-xl text-gray-400">Waiting for ad content...</p>
        <p className="text-sm mt-2 text-gray-600">Pair this screen in your Dashboard to upload media.</p>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div
      className="w-screen h-screen bg-black overflow-hidden relative cursor-none select-none"
    >
      {/* Invisible No-Sleep Video Fallback */}
      <video
        ref={noSleepVideoRef}
        loop
        muted
        playsInline
        className="fixed opacity-0 pointer-events-none w-1 h-1"
        src="https://raw.githubusercontent.com/anandthakker/no-sleep-video/master/no-sleep.mp4"
      />

      {isOffline && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
          <WifiOff size={11} />
          OFFLINE CACHE
        </div>
      )}

      <MediaViewer
        key={currentSlide.id}
        slide={currentSlide}
        onComplete={handleNextSlide}
      />

      {/* Brand watermark */}
      <Watermark enabled={watermarkEnabled} />

      {/* Fix 1: Disconnect button — visible only on mouse move */}
      {showDisconnectBtn && (
        <button
          className="disconnect-btn"
          onClick={disconnectDevice}
          title="Disconnect this display"
        >
          <Power size={14} />
          Disconnect
        </button>
      )}
    </div>
  );
}
