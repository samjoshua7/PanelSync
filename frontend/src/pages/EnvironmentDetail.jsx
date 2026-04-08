import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ArrowLeft, View } from "lucide-react";
import ScreenManager from "../components/ScreenManager";
import SlideManager from "../components/SlideManager";

export default function EnvironmentDetail() {
  const { envId } = useParams();
  const { token } = useAuth();
  const [screens, setScreens] = useState([]);
  
  useEffect(() => {
    if (token && envId) {
      loadScreens();
    }
  }, [token, envId]);

  const loadScreens = async () => {
    try {
      const data = await api.getScreensForEnvironment(token, envId);
      setScreens(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <header className="mb-8 flex items-center gap-4">
        <Link to="/dashboard" className="p-2 hover:bg-[#333] rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Environment Details
        </h1>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="lg:col-span-1 border-r border-[#333] pr-8">
          <ScreenManager envId={envId} token={token} screens={screens} onScreenAdded={loadScreens} />
        </aside>

        <section className="lg:col-span-2">
          {screens.length > 0 ? (
            <SlideManager screenId={screens[0].id} envId={envId} />
          ) : (
            <div className="text-center text-gray-500 py-20 border border-[#333] border-dashed rounded-2xl bg-[#1a1a1a]">
              <View size={48} className="mx-auto mb-4 text-gray-600" />
              <p>Pair a screen first to upload and manage slides.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
