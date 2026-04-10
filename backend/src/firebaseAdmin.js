const admin = require("firebase-admin");
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Option 1: Parse from a stringified JSON in the environment variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT env var:", error);
  }
} else {
  // Option 2: Fallback to local file for development
  try {
    serviceAccount = require("../firebaseServiceAccount.json");
  } catch (error) {
    console.error("Failed to load firebaseServiceAccount.json", error);
  }
}

try {
  if (!serviceAccount) {
    throw new Error("No service account credentials found. Set FIREBASE_SERVICE_ACCOUNT env var or provide firebaseServiceAccount.json.");
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("[FirebaseAdmin] Initialized successfully.");
} catch (error) {
  console.error("[FirebaseAdmin] CRITICAL: Initialization failed.", error.message);
  console.error("[FirebaseAdmin] Warning: Firestore calls will fail until configuration is corrected.");
}

const db = admin.firestore();

module.exports = { admin, db };
