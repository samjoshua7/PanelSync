import React from "react";

/**
 * Animated shimmer skeleton card for loading states.
 * @param {string} className - Additional Tailwind classes
 */
export default function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 overflow-hidden relative ${className}`}
      aria-busy="true"
      aria-label="Loading content"
    >
      {/* Shimmer sweep overlay */}
      <div className="skeleton-shimmer" />

      {/* Monitor icon placeholder */}
      <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] mb-4" />

      {/* Title placeholder */}
      <div className="h-5 bg-[#2a2a2a] rounded-lg w-3/4 mb-2" />

      {/* Subtitle placeholder */}
      <div className="h-3 bg-[#2a2a2a] rounded-lg w-1/2 mt-3" />
    </div>
  );
}
