import React, { useState, useRef, useEffect } from "react";

/**
 * <InfoTooltip message="..." />
 * Small ⓘ button. Hover (desktop) or click (touch) shows tooltip above.
 * Messages should come from src/utils/tooltipMessages.js
 */
export default function InfoTooltip({ message }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setVisible(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);

  return (
    <span
      ref={ref}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      <button
        type="button"
        aria-label="More info"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        style={{
          width: "15px",
          height: "15px",
          borderRadius: "50%",
          border: "1px solid",
          borderColor: visible ? "rgba(168,85,247,0.7)" : "rgba(100,100,120,0.6)",
          color: visible ? "#c084fc" : "rgba(120,120,140,0.9)",
          background: "transparent",
          cursor: "pointer",
          fontSize: "9px",
          fontWeight: "bold",
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "border-color 0.2s, color 0.2s",
          padding: 0,
        }}
      >
        i
      </button>

      {visible && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(14, 14, 22, 0.97)",
            border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: "10px",
            padding: "8px 11px",
            fontSize: "11.5px",
            color: "#c9cad6",
            whiteSpace: "normal",
            minWidth: "180px",
            maxWidth: "260px",
            zIndex: 500,
            lineHeight: 1.55,
            boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            textAlign: "left",
          }}
        >
          {message}
          {/* Caret */}
          <span
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid rgba(14, 14, 22, 0.97)",
            }}
          />
        </span>
      )}
    </span>
  );
}
