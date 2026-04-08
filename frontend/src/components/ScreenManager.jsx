import React, { useState } from "react";
import { api } from "../services/api";
import { Plus, Monitor, CheckCircle, Clock, Trash2, AlertCircle, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import Spinner from "./Spinner";

export default function ScreenManager({ envId, token, screens, onScreenAdded }) {
  const [pairingCode, setPairingCode] = useState("");
  const [screenName, setScreenName] = useState("");
  const [isPairing, setIsPairing] = useState(false);
  // Track which screen IDs are currently being removed
  const [removingIds, setRemovingIds] = useState(new Set());

  const handlePair = async (e) => {
    e.preventDefault();
    if (isPairing || !pairingCode.trim()) return;

    setIsPairing(true);
    const toastId = toast.loading("Pairing screen...");
    try {
      await api.pairScreen(token, pairingCode, envId, screenName);
      setPairingCode("");
      setScreenName("");
      toast.success("Screen paired successfully!", { id: toastId });
      onScreenAdded();
    } catch (err) {
      toast.error(err.message || "Failed to pair screen.", { id: toastId });
    } finally {
      setIsPairing(false);
    }
  };

  const handleRemoveScreen = async (screenId, screenName) => {
    if (removingIds.has(screenId)) return;
    if (!window.confirm(`Remove "${screenName}"? The TV will return to the pairing screen.`)) return;

    setRemovingIds((prev) => new Set(prev).add(screenId));
    const toastId = toast.loading("Removing screen...");
    try {
      await api.removeScreen(token, screenId);
      toast.success("Screen removed.", { id: toastId });
      onScreenAdded();
    } catch (err) {
      toast.error(err.message || "Failed to remove screen.", { id: toastId });
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(screenId);
        return next;
      });
    }
  };

  const getScreenStatus = (lastSeen) => {
    if (!lastSeen) return { status: "offline", label: "Offline" };
    const diff = new Date() - new Date(lastSeen);
    if (diff < 60_000) return { status: "online", label: "Online" };
    const threeHours = 3 * 60 * 60 * 1000;
    if (diff > threeHours) return { status: "inactive", label: "Inactive" };
    const timeLeft = threeHours - diff;
    const h = Math.floor(timeLeft / (1000 * 60 * 60));
    const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    return { status: "offline", label: `Offline · inactive in ${h}h ${m}m` };
  };

  return (
    <div className="bg-[#111114] rounded-2xl border border-[#222] p-6">
      <h2 className="text-base font-semibold mb-5 flex items-center gap-2 text-gray-200">
        <Monitor size={18} className="text-blue-400" />
        Linked Screens
      </h2>

      {/* Pair form */}
      <form onSubmit={handlePair} className="bg-[#0a0a0d] p-4 rounded-xl border border-[#1e1e24] mb-5">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Pair New Screen</p>
        <input
          type="text"
          placeholder="6-Digit TV Code"
          maxLength={6}
          value={pairingCode}
          onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
          className="w-full bg-[#111114] border border-[#2a2a2a] rounded-lg px-3 py-2.5 mb-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 uppercase tracking-widest text-center font-mono transition-colors"
        />
        <input
          type="text"
          placeholder="Friendly Name (e.g. Lobby TV)"
          value={screenName}
          onChange={(e) => setScreenName(e.target.value)}
          className="w-full bg-[#111114] border border-[#2a2a2a] rounded-lg px-3 py-2.5 mb-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          id="pair-screen-btn"
          disabled={!pairingCode.trim() || isPairing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg flex justify-center items-center gap-2 transition-colors"
        >
          {isPairing ? <Spinner size={16} /> : <Plus size={16} />}
          {isPairing ? "Pairing..." : "Link Screen"}
        </button>
      </form>

      {/* Screen list */}
      <div className="space-y-3">
        {screens.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-6">
            No screens paired yet.
          </p>
        ) : (
          screens.map((screen) => {
            const statusObj = getScreenStatus(screen.lastSeen);
            const isRemoving = removingIds.has(screen.id);

            return (
              <div
                key={screen.id}
                className="bg-[#0a0a0d] p-4 rounded-xl border border-[#1e1e24] flex justify-between items-center group hover:border-[#2a2a2a] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-white truncate">{screen.name}</p>
                  <p className="text-xs text-gray-600 font-mono mt-0.5">
                    {screen.id.substring(0, 12)}...
                  </p>
                  <div className="mt-1.5">
                    {statusObj.status === "online" && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle size={12} />
                        {statusObj.label}
                      </span>
                    )}
                    {statusObj.status === "offline" && (
                      <span className="flex items-center gap-1 text-xs text-yellow-500">
                        <Clock size={12} />
                        {statusObj.label}
                      </span>
                    )}
                    {statusObj.status === "inactive" && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle size={12} />
                        {statusObj.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  {/* Open screen link */}
                  <a
                    href={`/screen/${screen.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Open screen preview"
                  >
                    <ExternalLink size={15} />
                  </a>
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveScreen(screen.id, screen.name)}
                    disabled={isRemoving}
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Remove / Unpair Screen"
                  >
                    {isRemoving ? <Spinner size={15} /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
