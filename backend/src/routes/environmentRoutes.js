const express = require("express");
const { db } = require("../firebaseAdmin");
const router = express.Router();

// Get all environments for the current user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.uid;
    const envsSnapshot = await db.collection("environments").where("userId", "==", userId).get();
    
    const environments = [];
    envsSnapshot.forEach(doc => {
      environments.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(environments);
  } catch (error) {
    console.error("Error fetching environments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new environment
router.post("/", async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name } = req.body;
    
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    const newEnvRef = await db.collection("environments").add({
      name,
      userId,
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json({ id: newEnvRef.id, name, userId });
  } catch (error) {
    console.error("Error creating environment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
