const dns = require("node:dns");
dns.setDefaultResultOrder("ipv4first");

// Log startup attempt immediately
console.log(`[Startup] Process started at ${new Date().toISOString()}`);

process.on("uncaughtException", (err) => {
  console.error("[UncaughtException] CRITICAL:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UnhandledRejection] CRITICAL at:", promise, "reason:", reason);
});

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { db } = require("./src/firebaseAdmin");
const { verifyToken } = require("./src/middleware/authMiddleware");
const environmentRoutes = require("./src/routes/environmentRoutes");
const screenRoutes = require("./src/routes/screenRoutes");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "https://panel-sync-frontend.vercel.app",
  "https://panelsync.vercel.app",
  "https://panel-sync.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Request from blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────
// Public + protected screen routes (pairing is public, admin actions use verifyToken internally)
app.use("/api/screens", screenRoutes);

// Protected admin routes
app.use("/api/environments", verifyToken, environmentRoutes);

// Health check
app.get("/", (req, res) => res.send("PanelSync API running ✓"));

// ── Device Health Cleanup Cron ────────────────────────────────────────────
const TWO_MIN_MS          = 2  * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS  = 5  * 60 * 1000; // every 5 minutes

/**
 * Safely convert a lastSeen value to milliseconds.
 * Handles: Firestore Admin Timestamp, ISO string, numeric ms, or missing.
 */
const getLastSeenMs = (lastSeen) => {
  if (!lastSeen) return null;
  // Firestore Admin SDK Timestamp
  if (typeof lastSeen.toMillis === "function") return lastSeen.toMillis();
  // Firestore Admin SDK Timestamp (toDate fallback)
  if (typeof lastSeen.toDate === "function") return lastSeen.toDate().getTime();
  // ISO string or numeric
  const ms = new Date(lastSeen).getTime();
  return isNaN(ms) ? null : ms;
};

const runDeviceHealthCleanup = async () => {
  try {
    const now = Date.now();
    const screensSnapshot = await db.collection("screens").get();

    const toDelete      = [];
    const toMarkOffline = [];

    screensSnapshot.docs.forEach((docSnap) => {
      const { lastSeen, status } = docSnap.data();
      const lastSeenMs = getLastSeenMs(lastSeen);

      // Skip docs with no valid timestamp (e.g. freshly created without heartbeat)
      if (lastSeenMs === null) return;

      const diff = now - lastSeenMs;

      if (diff > TWENTY_FOUR_HOURS_MS) {
        // Auto-delete after 24 h of inactivity
        toDelete.push(docSnap);
      } else if (diff > TWO_MIN_MS && status !== "offline") {
        // Mark offline after 2 min of no heartbeat
        toMarkOffline.push(docSnap);
      }
    });

    // Batch operations — Firestore max 500 per batch
    const BATCH_SIZE = 500;

    // Mark offline
    for (let i = 0; i < toMarkOffline.length; i += BATCH_SIZE) {
      const batch = db.batch();
      toMarkOffline.slice(i, i + BATCH_SIZE).forEach((docSnap) =>
        batch.update(docSnap.ref, { status: "offline" })
      );
      await batch.commit();
    }

    // Delete stale
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = db.batch();
      toDelete.slice(i, i + BATCH_SIZE).forEach((docSnap) =>
        batch.delete(docSnap.ref)
      );
      await batch.commit();
    }

    if (toMarkOffline.length > 0 || toDelete.length > 0) {
      console.log(
        `[HealthCleanup] Marked offline: ${toMarkOffline.length} | Deleted: ${toDelete.length} — ${new Date().toISOString()}`
      );
    }
  } catch (err) {
    console.error("[HealthCleanup] Error during device cleanup:", err.message);
  }
};

// Run immediately on startup, then every 5 minutes
runDeviceHealthCleanup();
setInterval(runDeviceHealthCleanup, CLEANUP_INTERVAL_MS);

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] PanelSync API running on port ${PORT}`);
  console.log(`[HealthCleanup] Device cleanup cron started (every 5 min, threshold: 3h)`);
});
