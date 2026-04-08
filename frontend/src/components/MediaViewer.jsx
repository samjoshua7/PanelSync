import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Renders a single slide (image or video) for the TV slideshow.
 * Handles: crossfade animation, error fallback, auto-advance.
 */
export default function MediaViewer({ slide, onComplete }) {
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef(null);

  // Trigger crossfade entrance after mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Image duration timer
  useEffect(() => {
    if (slide.type !== "image" || error) return;
    const id = setTimeout(onComplete, (slide.duration || 10) * 1000);
    return () => clearTimeout(id);
  }, [slide, onComplete, error]);

  // Error skip timer
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(onComplete, 5000);
    return () => clearTimeout(id);
  }, [error, onComplete]);

  const handleError = () => {
    console.warn("[MediaViewer] Failed to load:", slide.url);
    setError(true);
  };

  if (error) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-red-500">
        <AlertTriangle size={56} className="mb-4 opacity-70" />
        <p className="text-xl font-bold">Media Unavailable</p>
        <p className="text-xs mt-2 opacity-60 max-w-sm text-center break-all px-4">
          {slide.url}
        </p>
        <p className="text-xs mt-4 text-gray-600">Skipping in 5 seconds...</p>
      </div>
    );
  }

  const fadeClass = `transition-opacity duration-700 ease-in-out ${visible ? "opacity-100" : "opacity-0"}`;

  if (slide.type === "video") {
    return (
      <video
        ref={videoRef}
        src={slide.url}
        autoPlay
        muted={!slide.audioEnabled}
        playsInline
        onEnded={onComplete}
        onError={handleError}
        className={`w-full h-full object-contain bg-black ${fadeClass}`}
      />
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center bg-black ${fadeClass}`}>
      <img
        src={slide.url}
        alt="slide content"
        onError={handleError}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}
