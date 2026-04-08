import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
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
import { MonitorX, Wifi, WifiOff, MonitorPlay } from "lucide-react";
import Spinner from "../components/Spinner";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RETRY_DELAY = 15000; // 15 seconds before re-attempting after error

export default function Slideshow() {
  const { screenId } = useParams();
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [isActivated, setIsActivated] = useState(false); // New activation state
  
  const wakeLockRef = useRef(null);
  const retryTimerRef = useRef(null);
  const noSleepVideoRef = useRef(null);

  // ── Activation Handler (Triggered by click) ──────────────────────────────
  const handleActivate = async () => {
    setIsActivated(true);
    
    // 1. Enter Fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("[Slideshow] Fullscreen denied:", err.message);
    }

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

  // ── Online / Offline + Heartbeat ────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let heartbeatInterval;
    if (screenId) {
      heartbeatInterval = setInterval(async () => {
        if (navigator.onLine) {
          try {
            await updateDoc(doc(db, "screens", screenId), {
              lastSeen: serverTimestamp(),
            });
          } catch (e) {
            console.warn("[Slideshow] Heartbeat failed:", e.message);
          }
        }
      }, HEARTBEAT_INTERVAL);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [screenId]);

  // ── Load Slides ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!screenId) return;

    const cached = localStorage.getItem(`slides_${screenId}`);
    if (cached) {
      try {
        setSlides(JSON.parse(cached));
        setLoading(false);
      } catch {}
    }

    let unsubscribe = () => {};

    const setup = async () => {
      try {
        const screenDocRef = doc(db, "screens", screenId);
        const screenSnap = await getDoc(screenDocRef);

        if (!screenSnap.exists()) {
          setErrorStatus("Screen not found.");
          setLoading(false);
          return;
        }

        const { userId, environmentId, envId: envIdField } = screenSnap.data();
        const envId = environmentId || envIdField;

        const q = query(
          collection(db, "environments", envId, "slides"),
          where("userId", "==", userId)
        );

        unsubscribe = onSnapshot(
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
      unsubscribe();
      clearTimeout(retryTimerRef.current);
    };
  }, [screenId]);

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

  // Activation Overlay (The core fix for fullscreen and sleep)
  if (!isActivated) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl mb-8 animate-glow-pulse">
          <MonitorPlay size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight">Display Ready</h1>
        <p className="text-gray-400 max-w-sm mb-12 text-lg">
          Tap the button below to start the ad rotation in fullscreen and disable screen sleep.
        </p>
        <button
          onClick={handleActivate}
          className="bg-white text-black px-12 py-5 rounded-3xl font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          Launch Display
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
    <div className="w-screen h-screen bg-black overflow-hidden relative cursor-none select-none">
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
    </div>
  );
}
