import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  ImagePlus,
  Film,
  Trash2,
  ArrowUp,
  ArrowDown,
  Volume2,
  VolumeX,
  Upload,
  Type,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";
import InfoTooltip from "./InfoTooltip";
import { TOOLTIP_MESSAGES } from "../utils/tooltipMessages";

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 50;

export default function SlideManager({ screenId, envId }) {
  const { currentUser } = useAuth();
  const [slides, setSlides] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  // Per-slide state maps (id → bool)
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [reorderingIds, setReorderingIds] = useState(new Set());

  // Text slide form state
  const [showTextForm, setShowTextForm] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textBg, setTextBg] = useState("#000000");
  const [textSize, setTextSize] = useState(36);
  const [addingText, setAddingText] = useState(false);

  useEffect(() => {
    if (!envId || !currentUser) return;

    const q = query(
      collection(db, "environments", envId, "slides"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => a.order - b.order);
        setSlides(data);
      },
      (err) => {
        console.warn("[SlideManager] Snapshot error:", err.message);
        toast.error("Failed to sync slides. Check your connection.");
      }
    );

    return unsubscribe;
  }, [envId, currentUser]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    // Reset input so same file can be re-uploaded if needed
    e.target.value = "";
    if (!file || uploading) return;

    const isVideo = file.type.startsWith("video/");
    const sizeMB = file.size / (1024 * 1024);

    if (isVideo && sizeMB > MAX_VIDEO_MB) {
      toast.error(`Video too large (max ${MAX_VIDEO_MB}MB). Your file: ${sizeMB.toFixed(1)}MB`);
      return;
    }
    if (!isVideo && sizeMB > MAX_IMAGE_MB) {
      toast.error(`Image too large (max ${MAX_IMAGE_MB}MB). Your file: ${sizeMB.toFixed(1)}MB`);
      return;
    }

    setUploading(true);
    setProgress(0);

    const storagePath = `users/${currentUser.uid}/envs/${envId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    const toastId = toast.loading("Uploading...");

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
        toast.loading(`Uploading ${Math.round(p)}%...`, { id: toastId });
      },
      (error) => {
        console.error("[SlideManager] Upload failed:", error);
        toast.error(`Upload failed: ${error.message}`, { id: toastId });
        setUploading(false);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "environments", envId, "slides"), {
            userId: currentUser.uid,
            envId,
            type: isVideo ? "video" : "image",
            url,
            storagePath,
            audioEnabled: isVideo ? true : null,
            order: slides.length,
            duration: isVideo ? 15 : 10,
            createdAt: serverTimestamp(),
          });
          toast.success("Slide added!", { id: toastId });
        } catch (err) {
          toast.error("Failed to save slide metadata.", { id: toastId });
        } finally {
          setUploading(false);
          setProgress(0);
        }
      }
    );
  };

  // ── Add Text Slide ──────────────────────────────────────────────────────────
  const addTextSlide = async (e) => {
    e.preventDefault();
    const trimmed = textContent.trim();
    if (!trimmed || addingText) return;
    setAddingText(true);
    const toastId = toast.loading("Adding text slide...");
    try {
      await addDoc(collection(db, "environments", envId, "slides"), {
        userId: currentUser.uid,
        envId,
        type: "text",
        content: trimmed,
        style: { color: textColor, fontSize: textSize, backgroundColor: textBg },
        order: slides.length,
        duration: 10,
        createdAt: serverTimestamp(),
      });
      toast.success("Text slide added!", { id: toastId });
      setTextContent("");
      setShowTextForm(false);
    } catch (err) {
      toast.error("Failed to add text slide.", { id: toastId });
    } finally {
      setAddingText(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteSlide = async (slide) => {
    if (deletingIds.has(slide.id)) return;

    setDeletingIds((prev) => new Set(prev).add(slide.id));
    const toastId = toast.loading("Deleting slide...");
    try {
      await deleteDoc(doc(db, "environments", envId, "slides", slide.id));
      // Storage cleanup (best-effort)
      if (slide.storagePath) {
        try {
          await deleteObject(ref(storage, slide.storagePath));
        } catch (err) {
          if (err.code !== "storage/object-not-found") {
            console.warn("[SlideManager] Storage delete failed:", err.message);
          }
        }
      }
      toast.success("Slide deleted.", { id: toastId });
    } catch (err) {
      toast.error("Failed to delete slide.", { id: toastId });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(slide.id);
        return next;
      });
    }
  };

  // ── Reorder ───────────────────────────────────────────────────────────────
  const moveSlide = async (index, direction) => {
    const current = slides[index];
    if (reorderingIds.has(current.id)) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= slides.length) return;

    const other = slides[swapIndex];

    setReorderingIds((prev) => {
      const next = new Set(prev);
      next.add(current.id);
      next.add(other.id);
      return next;
    });

    try {
      await Promise.all([
        updateDoc(doc(db, "environments", envId, "slides", current.id), { order: other.order }),
        updateDoc(doc(db, "environments", envId, "slides", other.id), { order: current.order }),
      ]);
    } catch {
      toast.error("Failed to reorder slides.");
    } finally {
      setReorderingIds((prev) => {
        const next = new Set(prev);
        next.delete(current.id);
        next.delete(other.id);
        return next;
      });
    }
  };

  // ── Duration / Audio ──────────────────────────────────────────────────────
  const updateDuration = async (id, duration) => {
    await updateDoc(doc(db, "environments", envId, "slides", id), {
      duration: Number(duration),
    });
  };

  const toggleAudio = async (slide) => {
    if (slide.type !== "video") return;
    await updateDoc(doc(db, "environments", envId, "slides", slide.id), {
      audioEnabled: !slide.audioEnabled,
    });
  };

  return (
    <div className="bg-[#111114] rounded-2xl border border-[#222]">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-[#1e1e24]">
        <h2 className="text-base font-semibold flex items-center gap-2 text-gray-200">
          <ImagePlus size={18} className="text-purple-400" />
          Manage Slides
          {slides.length > 0 && (
            <span className="ml-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {slides.length}
            </span>
          )}
        </h2>

        {/* Upload button */}
        <div className="flex items-center gap-2">
          <div className="relative overflow-hidden">
            <button
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors border ${
                uploading
                  ? "border-purple-500/50 text-purple-300 bg-purple-500/10 cursor-not-allowed"
                  : "border-[#2a2a2a] text-gray-300 hover:text-white hover:border-purple-500/50"
              }`}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Spinner size={14} className="text-purple-400" />
                  {Math.round(progress)}%
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload Media
                </>
              )}
            </button>
            {!uploading && (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                onChange={handleFileUpload}
                disabled={uploading}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                aria-label="Upload media file"
              />
            )}
          </div>
          <InfoTooltip message={TOOLTIP_MESSAGES.fileUpload} />

          {/* Add Text Slide toggle */}
          <button
            type="button"
            onClick={() => setShowTextForm((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors border ${
              showTextForm
                ? "border-blue-500/50 text-blue-300 bg-blue-500/10"
                : "border-[#2a2a2a] text-gray-300 hover:text-white hover:border-blue-500/40"
            }`}
          >
            {showTextForm ? <X size={14} /> : <Type size={14} />}
            Text Slide
          </button>
        </div>
      </div>

      {/* Text slide form */}
      {showTextForm && (
        <form
          onSubmit={addTextSlide}
          className="p-5 border-b border-[#1e1e24] bg-[#0c0c12] flex flex-col gap-4"
        >
          <textarea
            rows={3}
            placeholder="Enter slide text content..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            required
            className="w-full bg-[#111114] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
          <div className="flex flex-wrap gap-5 items-center">
            {/* Font size */}
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">
                Font Size: {textSize}px
              </label>
              <input
                type="range" min={12} max={72} step={2}
                value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value))}
                className="accent-blue-500"
              />
            </div>
            {/* Text color */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Text Color</label>
              <input
                type="color" value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-[#2a2a2a] bg-transparent"
              />
            </div>
            {/* Background color */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Background</label>
              <input
                type="color" value={textBg}
                onChange={(e) => setTextBg(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-[#2a2a2a] bg-transparent"
              />
            </div>
          </div>
          {/* Preview */}
          <div
            className="rounded-xl overflow-hidden h-16 flex items-center justify-center"
            style={{ backgroundColor: textBg }}
          >
            <p style={{ color: textColor, fontSize: Math.min(textSize * 0.5, 24), fontWeight: "bold" }}>
              {textContent || "Preview"}
            </p>
          </div>
          <button
            type="submit"
            disabled={addingText || !textContent.trim()}
            className="self-start px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-colors"
          >
            {addingText ? <Spinner size={14} /> : <Type size={14} />}
            {addingText ? "Adding..." : "Add Text Slide"}
          </button>
        </form>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <div className="h-0.5 bg-[#1a1a1a]">
          <div
            className="upload-progress-bar h-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Slide list */}
      <div className="p-6">
        {slides.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <ImagePlus size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No slides yet.</p>
            <p className="text-xs mt-1 text-gray-700">Upload images or videos to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, index) => {
              const isDeleting = deletingIds.has(slide.id);
              const isReordering = reorderingIds.has(slide.id);

              return (
                <div
                  key={slide.id}
                  className={`flex items-center gap-4 bg-[#0a0a0d] p-3 rounded-xl border border-[#1e1e24] transition-opacity ${
                    isDeleting || isReordering ? "opacity-50" : "opacity-100"
                  }`}
                >
                  {/* Reorder + audio controls */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveSlide(index, "up")}
                      disabled={index === 0 || isReordering}
                      className="p-1 hover:bg-[#1e1e24] rounded text-gray-500 disabled:opacity-20 transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveSlide(index, "down")}
                      disabled={index === slides.length - 1 || isReordering}
                      className="p-1 hover:bg-[#1e1e24] rounded text-gray-500 disabled:opacity-20 transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    {slide.type === "video" && (
                      <button
                        onClick={() => toggleAudio(slide)}
                        className="p-1 hover:bg-[#1e1e24] rounded text-gray-500 transition-colors mt-1"
                        title={slide.audioEnabled ? "Mute" : "Enable Audio"}
                      >
                        {slide.audioEnabled ? (
                          <Volume2 size={14} className="text-green-400" />
                        ) : (
                          <VolumeX size={14} className="text-red-400" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-20 h-14 bg-black rounded-lg overflow-hidden flex items-center justify-center relative flex-shrink-0">
                    {slide.type === "video" ? (
                      <>
                        <Film size={16} className="absolute text-white opacity-60 z-10" />
                        <video
                          src={slide.url}
                          className="opacity-60 object-cover w-full h-full"
                          muted
                          preload="metadata"
                        />
                      </>
                    ) : slide.type === "text" ? (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: slide.style?.backgroundColor || "#000" }}
                      >
                        <Type size={16} style={{ color: slide.style?.color || "#fff" }} />
                      </div>
                    ) : (
                      <img
                        src={slide.url}
                        alt="slide thumbnail"
                        className="object-cover w-full h-full"
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 capitalize flex items-center gap-1.5">
                      {slide.type === "video" ? (
                        <Film size={13} className="text-blue-400" />
                      ) : slide.type === "text" ? (
                        <Type size={13} className="text-cyan-400" />
                      ) : (
                        <ImagePlus size={13} className="text-purple-400" />
                      )}
                      {slide.type}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">Slide {index + 1}</p>
                  </div>

                  {/* Duration input */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <label className="text-[10px] text-gray-600 uppercase tracking-wider">Secs</label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={slide.duration}
                      disabled={slide.type === "video"}
                      onChange={(e) => updateDuration(slide.id, e.target.value)}
                      title={
                        slide.type === "video"
                          ? "Duration auto-handled by video length"
                          : "Display duration in seconds"
                      }
                      className={`w-14 bg-[#111114] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-sm text-center text-white focus:outline-none focus:border-purple-500 transition-colors ${
                        slide.type === "video" ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteSlide(slide)}
                    disabled={isDeleting}
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                    title="Delete slide"
                  >
                    {isDeleting ? <Spinner size={15} /> : <Trash2 size={15} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
