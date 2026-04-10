import React, { useState, useEffect } from "react";

/**
 * Names cycled every 4 s.
 * glow: true  → purple text-shadow glow effect
 * glow: false → soft white, no glow
 */
const CREDITS = [
  { name: "Sam Joshua", glow: false },
  { name: "Vignesh", glow: false },
  { name: "Ramakrishna", glow: false },
  { name: "Sanjay Anand", glow: false },
  { name: "Sai Radha Krishnan", glow: false },
  { name: "II CSE C", glow: true }
];

/**
 * <Watermark enabled={bool} />
 * Floating bottom-right, toast-like pill.
 * If enabled=false, renders nothing.
 */
export default function Watermark({ enabled = true }) {
  const [index, setIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const tick = setInterval(() => {
      // Fade out → swap name → fade in
      setFadeIn(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % CREDITS.length);
        setFadeIn(true);
      }, 280);
    }, 4000);
    return () => clearInterval(tick);
  }, [enabled]);

  if (!enabled) return null;

  const current = CREDITS[index];

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 60,
        background: "rgba(7, 7, 12, 0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        padding: "7px 13px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "1px",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {/* Small "Built by" label */}
      <span
        style={{
          fontSize: "8px",
          color: "rgba(140,140,165,0.65)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        Built by
      </span>

      {/* Cycling name — big, glowing or plain */}
      <span
        style={{
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.03em",
          transition: "opacity 0.28s ease",
          opacity: fadeIn ? 1 : 0,
          ...(current.glow
            ? {
              color: "#c084fc",
              textShadow:
                "0 0 6px rgba(192,132,252,0.85), 0 0 18px rgba(168,85,247,0.5)",
            }
            : {
              color: "rgba(210,210,228,0.88)",
              textShadow: "none",
            }),
        }}
      >
        {current.name}
      </span>
    </div>
  );
}
