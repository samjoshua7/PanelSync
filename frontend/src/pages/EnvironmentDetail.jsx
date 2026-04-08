import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { View, Layers } from "lucide-react";
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

  useEffect(() => {
    if (token && envId) {
      loadAll();
    }
  }, [token, envId]);

  const loadAll = async () => {
    setIsLoadingScreens(true);
    try {
      // Load env name and screens in parallel
      const [screensData, envData] = await Promise.all([
        api.getScreensForEnvironment(token, envId),
        api.getEnvironment(token, envId).catch(() => null),
      ]);
      setScreens(screensData);
      if (envData?.name) setEnvName(envData.name);
    } catch (err) {
      console.error("[EnvironmentDetail] Load failed:", err);
    } finally {
      setIsLoadingScreens(false);
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
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Layers size={28} className="text-purple-400" />
              {envName}
            </h1>
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
