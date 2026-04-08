const express = require("express");
const { db } = require("../firebaseAdmin");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

// Generate a random 6-character code
const generatePairingCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// TV calls this to get a new pairing code
router.post("/generate-pairing-code", async (req, res) => {
  try {
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes expiry

    const newCodeRef = await db.collection("pairingCodes").add({
      code,
      expiresAt,
      linkedScreenId: null, // this will be populated when an admin pairs
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ code, codeId: newCodeRef.id, expiresAt });
  } catch (error) {
    console.error("Error generating pairing code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// TV calls this periodically to check if the code has been linked
router.get("/check-pairing/:codeId", async (req, res) => {
  try {
    const { codeId } = req.params;
    const docDesc = await db.collection("pairingCodes").doc(codeId).get();
    
    if (!docDesc.exists) return res.status(404).json({ error: "Code not found" });
    
    const data = docDesc.data();
    if (data.linkedScreenId) {
      res.json({ linkedScreenId: data.linkedScreenId, environmentId: data.environmentId });
    } else {
      // Not paired yet
      res.json({ linkedScreenId: null });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADMIN calls this to link a screen to their environment
router.post("/pair", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { pairingCode, envId, name } = req.body;

    if (!pairingCode) return res.status(400).json({ error: "pairingCode is required" });
    if (!envId) return res.status(400).json({ error: "envId is required" });

    // Ensure environment belongs to user
    const envDoc = await db.collection("environments").doc(envId).get();
    if (!envDoc.exists || envDoc.data().userId !== userId) {
      return res.status(403).json({ error: "Unauthorized: Environment does not belong to user" });
    }

    // Find the code
    const codesSnapshot = await db.collection("pairingCodes")
      .where("code", "==", pairingCode.toUpperCase())
      .where("linkedScreenId", "==", null)
      .get();

    if (codesSnapshot.empty) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const codeDoc = codesSnapshot.docs[0];
    const codeData = codeDoc.data();

    // Check expiry
    if (new Date(codeData.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Code has expired" });
    }

    // Create the screen
    const screenRef = await db.collection("screens").add({
      name: name || `Screen ${pairingCode}`,
      envId: envId,
      environmentId: envId, // Keeping this for backward compatibility if needed temporarily
      userId, // keep user id for security rules
      status: "online",
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    // Update the pairing code to notify the TV
    await db.collection("pairingCodes").doc(codeDoc.id).update({
      linkedScreenId: screenRef.id,
      envId: envId
    });

    res.json({ success: true, screenId: screenRef.id });
  } catch (error) {
    console.error("Error pairing screen:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get screens for an environment
router.get("/env/:environmentId", verifyToken, async (req, res) => {
  try {
    const { environmentId } = req.params;
    const userId = req.user.uid;

    const envDoc = await db.collection("environments").doc(environmentId).get();
    if (!envDoc.exists || envDoc.data().userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const screensSnapshot = await db.collection("screens").where("environmentId", "==", environmentId).get();
    const screens = [];
    screensSnapshot.forEach(doc => screens.push({ id: doc.id, ...doc.data() }));

    res.json(screens);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove screen
router.delete("/:screenId", verifyToken, async (req, res) => {
  try {
    const { screenId } = req.params;
    const userId = req.user.uid;

    const screenDoc = await db.collection("screens").doc(screenId).get();
    if (!screenDoc.exists || screenDoc.data().userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    await db.collection("screens").doc(screenId).delete();
    
    // Also remove pairingCode linkage if we want, or just leave it. 
    // Usually deleting the screen is enough.
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing screen:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
