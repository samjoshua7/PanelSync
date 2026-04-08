import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { ImagePlus, Film, Trash2, ArrowUp, ArrowDown, Loader, Volume2, VolumeX } from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function SlideManager({ screenId, envId }) {
  const { currentUser } = useAuth();
  const [slides, setSlides] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!envId || !currentUser) return;
    // Remove orderBy to avoid requiring a custom composite index. We'll sort locally instead.
    console.log(`[Slide Debug] Listening to path: /environments/${envId}/slides`);
    const q = query(
      collection(db, "environments", envId, "slides"),
      where("userId", "==", currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const slideData = [];
        snapshot.forEach((doc) => slideData.push({ id: doc.id, ...doc.data() }));
        // Sort in memory by order
        slideData.sort((a, b) => a.order - b.order);
        setSlides(slideData);
      },
      (error) => {
        console.warn("Firestore snapshot error (Index building?):", error.message);
      }
    );

    return unsubscribe;
  }, [envId, currentUser]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // --- Upload restrictions ---
    // Change limits here if needed in the future
    const MAX_IMAGE_SIZE_MB = 5;
    const MAX_VIDEO_SIZE_MB = 50;
    
    const isVideo = file.type.startsWith("video/");
    const sizeInMB = file.size / (1024 * 1024);

    if (isVideo && sizeInMB > MAX_VIDEO_SIZE_MB) {
      console.warn(`[Upload Debug] Video blocked. Size: ${sizeInMB.toFixed(2)}MB`);
      alert(`Upload Error: Video exceeds the ${MAX_VIDEO_SIZE_MB}MB maximum limit.`);
      return;
    }
    if (!isVideo && sizeInMB > MAX_IMAGE_SIZE_MB) {
      console.warn(`[Upload Debug] Image blocked. Size: ${sizeInMB.toFixed(2)}MB`);
      alert(`Upload Error: Image exceeds the ${MAX_IMAGE_SIZE_MB}MB maximum limit.`);
      return;
    }
    
    console.log(`[Upload Debug] Uploading file. Type: ${file.type}, Size: ${sizeInMB.toFixed(2)}MB`);

    setUploading(true);
    setProgress(0);

    const storagePath = `users/${currentUser.uid}/envs/${envId}/${Date.now()}_${file.name}`;
    console.log(`[Storage Path Debug] Generating storagePath: ${storagePath}`);
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      },
      (error) => {
        console.error("Upload failed", error);
        alert(`Upload failed: ${error.message} - Permission Denied or File too large`);
        setUploading(false);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        
        await addDoc(collection(db, "environments", envId, "slides"), {
          userId: currentUser.uid,
          envId: envId,
          type: isVideo ? "video" : "image",
          url,
          storagePath,
          audioEnabled: isVideo ? true : null,
          order: slides.length,
          duration: isVideo ? 15 : 10, // Default duration in seconds
          createdAt: serverTimestamp()
        });
        
        setUploading(false);
      }
    );
  };

  const deleteSlide = async (slide) => {
    // Step 1: Delete Firestore document
    try {
      await deleteDoc(doc(db, "environments", envId, "slides", slide.id));
      console.log(`[Delete Debug] Success: Removed Firestore document for slide ${slide.id}`);
    } catch (err) {
      console.error(`[Delete Debug] Failed to delete Firestore document:`, err);
      // If we can't delete from Firestore, don't orphan the storage file yet.
      return;
    }

    // Step 2: Delete from Storage safely
    if (slide.storagePath) {
      try {
        console.log(`[Storage Path Debug] Proceeding to delete file at: ${slide.storagePath}`);
        const fileRef = ref(storage, slide.storagePath);
        await deleteObject(fileRef);
        console.log(`[Storage Delete Debug] Success: Deleted file from storage: ${slide.storagePath}`);
      } catch (err) {
        if (err.code === "storage/object-not-found") {
          console.warn(`[Storage Delete Debug] Object not found in storage, skipping deletion: ${slide.storagePath}`);
        } else {
          console.error(`[Storage Delete Debug] Failed to delete file in storage:`, err);
        }
      }
    } else {
      console.warn(`[Delete Debug] No storagePath found for slide ${slide.id}, ignoring storage deletion`);
    }
  };

  const moveSlide = async (index, direction) => {
    if (direction === "up" && index > 0) {
      const current = slides[index];
      const prev = slides[index - 1];
      // Optimistically update order by swapping
      await updateDoc(doc(db, "environments", envId, "slides", current.id), { order: prev.order });
      await updateDoc(doc(db, "environments", envId, "slides", prev.id), { order: current.order });
    } else if (direction === "down" && index < slides.length - 1) {
      const current = slides[index];
      const next = slides[index + 1];
      // Optimistically update order by swapping
      await updateDoc(doc(db, "environments", envId, "slides", current.id), { order: next.order });
      await updateDoc(doc(db, "environments", envId, "slides", next.id), { order: current.order });
    }
  };

  const updateDuration = async (id, duration) => {
    await updateDoc(doc(db, "environments", envId, "slides", id), { duration: Number(duration) });
  };

  const toggleAudio = async (slide) => {
    if (slide.type !== "video") return;
    await updateDoc(doc(db, "environments", envId, "slides", slide.id), { audioEnabled: !slide.audioEnabled });
  };

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ImagePlus className="text-purple-400" /> Manage Slides
        </h2>
        <div className="relative overflow-hidden inline-block border border-[#333] hover:border-purple-400 rounded-lg bg-[#0a0a0a] transition-colors cursor-pointer group">
          <button className="px-4 py-2 text-sm font-medium flex items-center gap-2 group-hover:text-purple-400">
            {uploading ? <><Loader className="animate-spin" size={16}/> Uploading {Math.round(progress)}%</> : <><PlusIcon /> Upload Media</>}
          </button>
          <input
            type="file"
            accept="image/png, image/jpeg, video/mp4"
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute left-0 top-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
      </div>

      <div className="space-y-3">
        {slides.map((slide, index) => (
          <div key={slide.id} className="flex items-center gap-4 bg-[#0a0a0a] p-3 rounded-xl border border-[#333]">
            <div className="flex flex-col gap-1 mr-2">
              <button 
                onClick={() => moveSlide(index, "up")} 
                disabled={index === 0}
                className="p-1 hover:bg-[#333] rounded text-gray-400 disabled:opacity-30 transition-colors"
                title="Move Up"
              >
                <ArrowUp size={16} />
              </button>
              <button 
                onClick={() => moveSlide(index, "down")} 
                disabled={index === slides.length - 1}
                className="p-1 hover:bg-[#333] rounded text-gray-400 disabled:opacity-30 transition-colors"
                title="Move Down"
              >
                <ArrowDown size={16} />
              </button>
              {slide.type === "video" && (
                <button 
                  onClick={() => toggleAudio(slide)}
                  className="p-1 hover:bg-[#333] rounded text-gray-400 transition-colors mt-2"
                  title={slide.audioEnabled ? "Mute Video" : "Enable Audio"}
                >
                  {slide.audioEnabled ? <Volume2 size={16} className="text-green-400" /> : <VolumeX size={16} className="text-red-400" />}
                </button>
              )}
            </div>
            <div className="w-24 h-16 bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
              {slide.type === "video" ? (
                <>
                  <Film className="absolute text-white opacity-50" />
                  <video src={slide.url} className="opacity-70 object-cover w-full h-full" />
                </>
              ) : (
                <img src={slide.url} alt="slide" className="object-cover w-full h-full" />
              )}
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium capitalize flex items-center gap-1">
                {slide.type === "video" ? <Film size={14}/> : <ImagePlus size={14}/>} {slide.type} Slide
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Duration (s)</label>
              <input
                type="number"
                min="1"
                value={slide.duration}
                disabled={slide.type === "video"}
                onChange={(e) => updateDuration(slide.id, e.target.value)}
                title={slide.type === "video" ? "Duration is auto-handled by video length" : ""}
                className={`w-16 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-500 text-center ${slide.type === "video" ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            <button onClick={() => deleteSlide(slide)} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {slides.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No slides yet. Upload some images or videos.
          </div>
        )}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  )
}
