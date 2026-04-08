const express = require("express");
const { db } = require("../firebaseAdmin");
const router = express.Router();

// ── GET /api/environments ─────────────────────────────────────────────────
// List all environments for the authenticated user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db
      .collection("environments")
      .where("userId", "==", userId)
      .get();

    const environments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(environments);
  } catch (error) {
    console.error("[Env] GET / error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/environments/:id ─────────────────────────────────────────────
// Get a single environment (owner-gated)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const envDoc = await db.collection("environments").doc(id).get();
    if (!envDoc.exists || envDoc.data().userId !== userId) {
      return res.status(403).json({ error: "Unauthorized or not found" });
    }

    res.json({ id: envDoc.id, ...envDoc.data() });
  } catch (error) {
    console.error("[Env] GET /:id error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/environments ────────────────────────────────────────────────
// Create a new environment
router.post("/", async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const newEnvRef = await db.collection("environments").add({
      name: name.trim(),
      userId,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ id: newEnvRef.id, name: name.trim(), userId });
  } catch (error) {
    console.error("[Env] POST / error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/environments/:id ─────────────────────────────────────────────
// Rename an environment (owner-gated)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const envDoc = await db.collection("environments").doc(id).get();
    if (!envDoc.exists || envDoc.data().userId !== userId) {
      return res.status(403).json({ error: "Unauthorized or not found" });
    }

    await db.collection("environments").doc(id).update({
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    });

    res.json({ id, name: name.trim() });
  } catch (error) {
    console.error("[Env] PUT /:id error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/environments/:id ──────────────────────────────────────────
// Delete an environment and all its linked screens (owner-gated)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const envDoc = await db.collection("environments").doc(id).get();
    if (!envDoc.exists || envDoc.data().userId !== userId) {
      return res.status(403).json({ error: "Unauthorized or not found" });
    }

    // Cascade: delete all screens linked to this environment
    const screensSnapshot = await db
      .collection("screens")
      .where("environmentId", "==", id)
      .get();

    const batch = db.batch();
    screensSnapshot.forEach((screenDoc) => batch.delete(screenDoc.ref));
    // Delete the environment itself
    batch.delete(db.collection("environments").doc(id));
    await batch.commit();

    console.log(
      `[Env] Deleted environment ${id} with ${screensSnapshot.size} screens.`
    );
    res.json({ success: true, deletedScreens: screensSnapshot.size });
  } catch (error) {
    console.error("[Env] DELETE /:id error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
