import React from "react";
import { resolveValue } from "react-hot-toast";
import { CheckCircle, XCircle, Loader } from "lucide-react";

const TOAST_DURATION = 3000;

function ToastIcon({ type }) {
  if (type === "success")
    return <CheckCircle size={17} style={{ color: "#a855f7", flexShrink: 0 }} />;
  if (type === "error")
    return <XCircle size={17} style={{ color: "#ef4444", flexShrink: 0 }} />;
  if (type === "loading")
    return (
      <Loader
        size={17}
        style={{ color: "#818cf8", flexShrink: 0, animation: "spin 1s linear infinite" }}
      />
    );
  return null;
}

/**
 * Custom toast bar — dark glass card with animated progress bar.
 * Used as the children render prop of <Toaster />.
 */
export default function CustomToast({ t }) {
  const message = resolveValue(t.message, t);
  const isLoading = t.type === "loading";

  const progressColor =
    t.type === "error"
      ? "linear-gradient(90deg, #ef4444, #f97316)"
      : "linear-gradient(90deg, #3b82f6, #a855f7)";

  return (
    <div
      role="alert"
      style={{
        position: "relative",
        background: "rgba(10, 10, 15, 0.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        color: "#e5e7eb",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        padding: isLoading ? "12px 16px" : "12px 16px 17px",
        fontSize: "13.5px",
        minWidth: "220px",
        maxWidth: "340px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: t.visible ? "auto" : "none",
        lineHeight: 1.4,
      }}
    >
      <ToastIcon type={t.type} />
      <span style={{ flex: 1 }}>{message}</span>

      {/* Progress bar — only for timed (non-loading) toasts */}
      {!isLoading && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              height: "100%",
              background: progressColor,
              animation: t.visible
                ? `toastProgress ${TOAST_DURATION}ms linear forwards`
                : "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
