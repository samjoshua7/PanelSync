import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { View, Layers } from "lucide-react";
import { db } from "../firebase";
import { doc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import ScreenManager from "../components/ScreenManager";
import SlideManager from "../components/SlideManager";
import Spinner from "../components/Spinner";

export default function EnvironmentDetail() {
  const { envId } = useParams();
  const { token } = useAuth();
  const [screens, setScreens] = useState([]);
  const [envName, setEnvName] = useState("Environment");
  const [isLoadingScreens, setIsLoadingScreens] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [isTogglingWatermark, setIsTogglingWatermark] = useState(false);

  // Fix 3b: Real-time screens listener — admin panel auto-refreshes when a
  //         device heartbeat changes status (online/offline) without a reload.
  useEffect(() => {
    if (!token || !envId) return;

    // Load env metadata once (name + watermark) via REST
    api.getEnvironment(token, envId)
      .then((envData) => {
        if (envData?.name) setEnvName(envData.name);
        if (envData)       setWatermarkEnabled(envData.watermarkEnabled !== false);
      })
      .catch((err) => console.warn("[EnvironmentDetail] Env fetch failed:", err));

    // Subscribe to screens in real-time
    const q = query(
      collection(db, "screens"),
      where("environmentId", "==", envId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setScreens(data);
        setIsLoadingScreens(false);
      },
      (err) => {
        console.error("[EnvironmentDetail] Screens listener error:", err);
        setIsLoadingScreens(false);
      }
    );

    return () => unsubscribe();
  }, [token, envId]);

  // Keep loadAll for manual refresh calls (e.g. after pairing a new screen)
  const loadAll = async () => {
    // The onSnapshot listener handles live updates; this is a no-op kept for
    // compatibility with ScreenManager's onScreenAdded prop.
    // Firestore will automatically push the new screen doc to the listener.
  };

  const handleToggleWatermark = async () => {
    if (isTogglingWatermark) return;
    setIsTogglingWatermark(true);
    const newVal = !watermarkEnabled;
    setWatermarkEnabled(newVal); // optimistic
    try {
      await updateDoc(doc(db, "environments", envId), { watermarkEnabled: newVal });
    } catch (err) {
      setWatermarkEnabled(!newVal); // rollback
      toast.error("Failed to update watermark setting.");
    } finally {
      setIsTogglingWatermark(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <Navbar />

      <main className="pt-16 px-4 md:px-8 pb-12">
        <div className="max-w-7xl mx-auto">

          {/* Page header */}
          <div className="py-8 mb-6">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <a href="/dashboard" className="hover:text-gray-300 transition-colors">Dashboard</a>
              <span>/</span>
              <span className="text-gray-300">{envName}</span>
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Layers size={28} className="text-purple-400" />
                {envName}
              </h1>
              {/* Watermark toggle */}
              <button
                id="watermark-toggle-btn"
                onClick={handleToggleWatermark}
                disabled={isTogglingWatermark}
                title={watermarkEnabled ? "Hide watermark on TV" : "Show watermark on TV"}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "6px 14px", borderRadius: "10px",
                  border: `1px solid ${watermarkEnabled ? "rgba(168,85,247,0.4)" : "rgba(60,60,80,0.7)"}`,
                  background: watermarkEnabled ? "rgba(168,85,247,0.08)" : "rgba(30,30,40,0.6)",
                  color: watermarkEnabled ? "#c084fc" : "rgba(140,140,160,0.8)",
                  fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
                  opacity: isTogglingWatermark ? 0.6 : 1,
                }}
              >
                <span style={{
                  width: "28px", height: "16px", borderRadius: "99px",
                  background: watermarkEnabled ? "#a855f7" : "rgba(60,60,80,0.9)",
                  position: "relative", transition: "background 0.2s",
                  display: "inline-block", flexShrink: 0,
                }}>
                  <span style={{
                    position: "absolute", top: "2px",
                    left: watermarkEnabled ? "14px" : "2px",
                    width: "12px", height: "12px", borderRadius: "50%",
                    background: "white", transition: "left 0.2s",
                  }} />
                </span>
                Watermark {watermarkEnabled ? "On" : "Off"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Screens sidebar */}
            <aside className="lg:col-span-1">
              {isLoadingScreens ? (
                <div className="bg-[#111114] rounded-2xl border border-[#222] p-6 flex items-center justify-center h-48">
                  <Spinner size={24} className="text-purple-400" />
                </div>
              ) : (
                <ScreenManager
                  envId={envId}
                  token={token}
                  screens={screens}
                  onScreenAdded={loadAll}
                />
              )}
            </aside>

            {/* Slide manager main area */}
            <section className="lg:col-span-2">
              {isLoadingScreens ? (
                <div className="bg-[#111114] rounded-2xl border border-[#222] p-6 flex items-center justify-center h-48">
                  <Spinner size={24} className="text-purple-400" />
                </div>
              ) : screens.length > 0 ? (
                <SlideManager screenId={screens[0].id} envId={envId} />
              ) : (
                <div className="text-center text-gray-500 py-20 border border-[#222] border-dashed rounded-2xl bg-[#111114]">
                  <View size={48} className="mx-auto mb-4 text-gray-700" />
                  <p className="font-medium text-gray-400">No screen paired yet</p>
                  <p className="text-sm mt-1 text-gray-600">Pair a screen first to manage slides.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
