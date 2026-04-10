import React, { useState, useEffect } from "react";
import { Loader2, Zap } from "lucide-react";

export default function WakeUpOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    const hide = () => setVisible(false);

    window.addEventListener("panelsync:slow-response", show);
    window.addEventListener("panelsync:response-received", hide);

    return () => {
      window.removeEventListener("panelsync:slow-response", show);
      window.removeEventListener("panelsync:response-received", hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-fade-in">
      {/* Glasmorphism Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      
      <div className="relative bg-[#0c0c10] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center overflow-hidden">
        {/* Animated Background Pulse */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-purple-600/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6 border border-white/5">
          <Zap size={28} className="text-yellow-400 animate-pulse" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">Backend is Waking Up</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Our Render server is waking up from its nap. 
          <br />
          <span className="font-medium text-purple-300">This usually takes 30-60s on the first visit.</span>
        </p>

        <div className="flex items-center justify-center gap-3 text-sm font-medium text-gray-500">
          <Loader2 size={16} className="animate-spin text-purple-400" />
          <span>Keep this tab open...</span>
        </div>
      </div>
    </div>
  );
}
