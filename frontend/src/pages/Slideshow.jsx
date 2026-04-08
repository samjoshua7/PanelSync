import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, collection, query, where, orderBy, onSnapshot, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import MediaViewer from "../components/MediaViewer";
import { MonitorX } from "lucide-react";

export default function Slideshow() {
  const { screenId } = useParams();
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);

  // Handle Heartbeat and Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let heartbeatInterval;
    if (screenId) {
      heartbeatInterval = setInterval(async () => {
        if (navigator.onLine) {
          try {
            await updateDoc(doc(db, "screens", screenId), {
              lastSeen: serverTimestamp()
            });
          } catch (e) {
            console.error("Heartbeat failed", e);
          }
        }
      }, 30000); // 30 seconds
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [screenId]);

  // Load Slides
  useEffect(() => {
    if (!screenId) return;

    // We cache slides in localStorage for offline PWA fallback
    const cached = localStorage.getItem(`slides_${screenId}`);
    if (cached) {
      try {
        setSlides(JSON.parse(cached));
      } catch(e){}
    }

    let unsubscribe = () => {};

    const loadSlidesSecurely = async () => {
      console.log("[Screen Debug] 1. Setting up slideshow for screenId:", screenId);
      try {
        // Find the userId from the screen doc to satisfy the security rule
        const screenDocRef = doc(db, "screens", screenId);
        const screenSnap = await getDoc(screenDocRef);
        
        if (!screenSnap.exists()) {
          console.error("[Screen Debug] Error: Screen document not found in Firestore");
          setErrorStatus("Screen not found");
          setLoading(false);
          return;
        }
        
        const userId = screenSnap.data().userId;
        const envId = screenSnap.data().environmentId || screenSnap.data().envId;
        console.log("[Screen Debug] 2. Found userId:", userId, "envId:", envId);

        console.log(`[Screen Debug] 3. Listening to path: /environments/${envId}/slides where userId=${userId}`);
        const q = query(
          collection(db, "environments", envId, "slides"), 
          where("userId", "==", userId)
        );
        
        unsubscribe = onSnapshot(q, 
          (snapshot) => {
            console.log(`[Slides Debug] 4. Snapshot received. Docs count: ${snapshot.docs.length}`);
            const slideData = [];
            snapshot.forEach(doc => slideData.push({ id: doc.id, ...doc.data() }));
            // Sort locally
            slideData.sort((a, b) => a.order - b.order);
            console.log(`[Slides Debug] 5. Computed slides data:`, slideData.map(s => ({id: s.id, order: s.order, type: s.type})));
            setSlides(slideData);
            setLoading(false);
            localStorage.setItem(`slides_${screenId}`, JSON.stringify(slideData));
            
            // Reset if index is out of bounds due to deletion
            setCurrentIndex(prev => prev >= slideData.length ? 0 : prev);
          },
          (err) => {
            console.error("[Slides Debug] Snapshot error (Check Rules/Indexes):", err);
            setErrorStatus(`Permission/Index Error: ${err.message}`);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("[Screen Debug] Failed to setup slides listener:", err);
        setErrorStatus("Failed to setup listener");
        setLoading(false);
      }
    };

    loadSlidesSecurely();

    return () => unsubscribe();
  }, [screenId]);

  const handleNextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % slides.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-gray-500">
        <MonitorX size={64} className="mb-4 opacity-50 animate-pulse" />
        <p className="text-xl">Loading presentation...</p>
        <p className="text-sm mt-2 opacity-50">Screen ID: {screenId.substring(0,8)}</p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-500">
        <MonitorX size={64} className="mb-4 opacity-80" />
        <p className="text-xl font-bold">Failed to load content</p>
        <p className="text-sm mt-2 opacity-80">{errorStatus}</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-gray-500">
        <MonitorX size={64} className="mb-4 opacity-50" />
        <p className="text-xl">No slides found. Waiting for media...</p>
        <p className="text-sm mt-2 opacity-50">Screen ID: {screenId.substring(0,8)}</p>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {isOffline && (
        <div className="absolute top-4 left-4 z-50 bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold animate-pulse shadow-lg">
          OFFLINE CACHE
        </div>
      )}
      
      <MediaViewer 
        key={currentSlide.id} // forces remount on slide change
        slide={currentSlide} 
        onComplete={handleNextSlide} 
      />
    </div>
  );
}
