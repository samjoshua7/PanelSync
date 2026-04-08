import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import Spinner from "./Spinner";

/**
 * Generic confirmation / input modal.
 * Props:
 *   title        - Modal heading
 *   message      - Supporting text (optional)
 *   children     - Extra content (e.g., rename input) rendered inside body
 *   confirmLabel - Text for the action button (default: "Confirm")
 *   isDestructive - If true, action button turns red
 *   isLoading    - Shows spinner and disables buttons while in flight
 *   onConfirm    - Callback on confirm
 *   onCancel     - Callback on cancel / close
 */
export default function ConfirmModal({
  title,
  message,
  children,
  confirmLabel = "Confirm",
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const modalRef = useRef(null);

  // Trap focus inside modal and handle Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && !isLoading) onCancel();
    };
    document.addEventListener("keydown", handleKey);
    // Focus first focusable element
    modalRef.current?.querySelector("button, input")?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [isLoading, onCancel]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md shadow-2xl animate-modal-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
          <h2 id="modal-title" className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-40"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {message && (
            <p className="text-gray-400 text-sm mb-4">{message}</p>
          )}
          {children}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-300 hover:bg-[#2a2a2a] transition-colors text-sm font-medium disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {isLoading ? <Spinner size={16} /> : null}
            {isLoading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
