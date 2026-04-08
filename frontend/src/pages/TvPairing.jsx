import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { MonitorPlay } from "lucide-react";

export default function TvPairing() {
  const [pairingData, setPairingData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    
    const generateCodeAndPoll = async () => {
      try {
        const data = await api.generatePairingCode();
        setPairingData(data);
        
        // Start polling every 3 seconds to see if an admin paired the code
        interval = setInterval(async () => {
          const status = await api.checkPairingStatus(data.codeId);
          if (status.linkedScreenId) {
            clearInterval(interval);
            navigate(`/screen/${status.linkedScreenId}`);
          }
        }, 3000);
      } catch (err) {
        console.error("Failed to generate pairing code", err);
      }
    };

    generateCodeAndPoll();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <MonitorPlay size={64} className="text-blue-500 mb-8" />
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">PanelSync Screen</h1>
      
      <div className="bg-[#111] border border-[#333] rounded-3xl p-12 text-center max-w-md w-full shadow-2xl mt-8">
        <p className="text-xl text-gray-400 mb-4">Enter this code in your Dashboard to pair</p>
        <div className="text-7xl font-mono tracking-[0.5em] font-bold text-white mb-2 pl-4">
          {pairingData ? pairingData.code : "..."}
        </div>
      </div>
      
      <div className="mt-12 text-gray-500 flex gap-4 text-sm">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Waiting for connection</span>
      </div>
    </div>
  );
}
