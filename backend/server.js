const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');


const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const { verifyToken } = require("./src/middleware/authMiddleware");
const environmentRoutes = require("./src/routes/environmentRoutes");
const screenRoutes = require("./src/routes/screenRoutes");

app.use(cors({
  origin: [
    "http://localhost:5173", 
    "https://panel-sync-frontend.vercel.app",
    "https://panelsync.vercel.app" // Just in case
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Public + Protected Screen Routes inside
app.use("/api/screens", screenRoutes);

// Protected routes (Admin App)
app.use("/api/environments", verifyToken, environmentRoutes);

app.get("/", (req, res) => {
  res.send("PanelSync API running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
