// Basic API fetch wrapper using the auth token

// Use environment variable for production, fallback to localhost for development
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getHeaders = (token) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export const api = {
  // --- Environments ---
  getEnvironments: async (token) => {
    const res = await fetch(`${BASE_URL}/environments`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch environments");
    return res.json();
  },
  createEnvironment: async (token, name) => {
    const res = await fetch(`${BASE_URL}/environments`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error("Failed to create environment");
    return res.json();
  },

  // --- Screens ---
  getScreensForEnvironment: async (token, environmentId) => {
    const res = await fetch(`${BASE_URL}/screens/env/${environmentId}`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch screens");
    return res.json();
  },
  generatePairingCode: async () => {
    const res = await fetch(`${BASE_URL}/screens/generate-pairing-code`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate code");
    return res.json();
  },
  checkPairingStatus: async (codeId) => {
    const res = await fetch(`${BASE_URL}/screens/check-pairing/${codeId}`);
    if (!res.ok) throw new Error("Failed to check pairing");
    return res.json();
  },
  pairScreen: async (token, pairingCode, envId, name) => {
    const res = await fetch(`${BASE_URL}/screens/pair`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ pairingCode, envId, name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to pair screen");
    return data;
  },
  removeScreen: async (token, screenId) => {
    const res = await fetch(`${BASE_URL}/screens/${screenId}`, {
      method: "DELETE",
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error("Failed to remove screen");
    return res.json();
  }
};
