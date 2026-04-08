const dns = require("node:dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { db } = require("./src/firebaseAdmin");
const { verifyToken } = require("./src/middleware/authMiddleware");
const environmentRoutes = require("./src/routes/environmentRoutes");
const screenRoutes = require("./src/routes/screenRoutes");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://panel-sync-frontend.vercel.app",
      "https://panelsync.vercel.app",
      "https://panel-sync.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
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
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

const runDeviceHealthCleanup = async () => {
  try {
    const now = Date.now();
    const screensSnapshot = await db.collection("screens").get();

    const toDelete = screensSnapshot.docs.filter((doc) => {
      const { lastSeen } = doc.data();
      if (!lastSeen) return false; // Don't delete screens with no heartbeat data yet
      const lastSeenMs = new Date(lastSeen).getTime();
      return now - lastSeenMs > THREE_HOURS_MS;
    });

    if (toDelete.length === 0) return;

    // Batch delete (Firestore max 500 per batch)
    const BATCH_SIZE = 500;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const chunk = toDelete.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    console.log(
      `[HealthCleanup] Removed ${toDelete.length} inactive screen(s) at ${new Date().toISOString()}`
    );
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
