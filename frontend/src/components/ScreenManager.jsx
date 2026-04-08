import React, { useState } from "react";
import { api } from "../services/api";
import { Plus, Monitor, CheckCircle, Clock, Trash2, AlertCircle } from "lucide-react";

export default function ScreenManager({ envId, token, screens, onScreenAdded }) {
  const [pairingCode, setPairingCode] = useState("");
  const [screenName, setScreenName] = useState("");
  const [error, setError] = useState("");

  const handlePair = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.pairScreen(token, pairingCode, envId, screenName);
      setPairingCode("");
      setScreenName("");
      onScreenAdded();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveScreen = async (screenId) => {
    if (window.confirm("Are you sure you want to remove this screen?")) {
      try {
        await api.removeScreen(token, screenId);
        onScreenAdded();
      } catch (err) {
        alert("Failed to remove: " + err.message);
      }
    }
  };

  const getScreenStatus = (lastSeen) => {
    if (!lastSeen) return { status: "offline", label: "Offline" };
    const diff = new Date() - new Date(lastSeen);
    
    // Within 1 minute is online
    if (diff < 60000) return { status: "online", label: "Online" };
    
    // More than 3 hours is inactive
    const threeHours = 3 * 60 * 60 * 1000;
    if (diff > threeHours) return { status: "inactive", label: "Inactive" };
    
    // Calculate time left before inactive
    const timeLeft = threeHours - diff;
    const h = Math.floor(timeLeft / (1000 * 60 * 60));
    const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    return { status: "offline", label: `Offline (Inactive in ${h}h ${m}m)` };
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Monitor className="text-blue-400" /> Linked Screens
      </h2>
      
      <form onSubmit={handlePair} className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#333] mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Pair New Screen</h3>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <input
          type="text"
          placeholder="6-Digit TV Code"
          maxLength={6}
          value={pairingCode}
          onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
          className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-blue-500 uppercase tracking-widest text-center font-mono"
        />
        <input
          type="text"
          placeholder="Friendly Name (e.g., Lobby TV)"
          value={screenName}
          onChange={(e) => setScreenName(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!pairingCode}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg flex justify-center items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Link App
        </button>
      </form>

      <div className="space-y-4">
        {screens.map(screen => {
          const statusObj = getScreenStatus(screen.lastSeen);
          return (
            <div key={screen.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333] flex justify-between items-center group">
              <div>
                <p className="font-medium">{screen.name}</p>
                <p className="text-xs text-gray-500">ID: {screen.id.substring(0,8)}</p>
                <div className="mt-1">
                  {statusObj.status === "online" && (
                    <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={14}/> {statusObj.label}</span>
                  )}
                  {statusObj.status === "offline" && (
                    <span className="flex items-center gap-1 text-xs text-yellow-500"><Clock size={14}/> {statusObj.label}</span>
                  )}
                  {statusObj.status === "inactive" && (
                    <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle size={14}/> {statusObj.label}</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleRemoveScreen(screen.id)}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Remove / Unpair Screen"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
