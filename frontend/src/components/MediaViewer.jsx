import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function MediaViewer({ slide, onComplete }) {
  const [error, setError] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let timeoutId;
    
    if (slide.type === "image" && !error) {
      timeoutId = setTimeout(() => {
        onComplete();
      }, (slide.duration || 10) * 1000);
    }

    if (error) {
      // Fast fallback to skip broken slide after 5 seconds
      timeoutId = setTimeout(() => {
        onComplete();
      }, 5000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [slide, onComplete, error]);

  const handleVideoEnded = () => {
    onComplete();
  };

  const handleError = (e) => {
    console.warn(`[MediaViewer Debug] Media failed to load (likely 404): ${slide.url}`);
    setError(true);
  };

  if (error) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-red-500 animate-pulse">
        <AlertTriangle size={64} className="mb-4 opacity-80" />
        <p className="text-xl font-bold">Media Unavailable</p>
        <p className="text-sm mt-2 opacity-80 break-all max-w-lg text-center px-4">{slide.url}</p>
        <p className="text-xs mt-4 text-gray-500">Skipping in 5 seconds...</p>
      </div>
    );
  }

  if (slide.type === "video") {
    // Video audio & auto-duration logic
    console.log(`[Video Debug] Playing video. URL: ${slide.url}, Audio enabled: ${!!slide.audioEnabled}`);
    return (
      <video
        ref={videoRef}
        src={slide.url}
        autoPlay
        muted={!slide.audioEnabled}
        playsInline
        onEnded={handleVideoEnded}
        onError={handleError}
        className="w-full h-full object-contain bg-black animate-fade-in"
      />
    );
  }

  console.log(`[Image Debug] Displaying image in <img> tag. URL: ${slide.url}`);
  return (
    <div className="w-full h-full flex items-center justify-center bg-black animate-fade-in transition-opacity duration-1000">
      <img 
        src={slide.url} 
        alt="slide content" 
        onError={handleError}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}
