// API service — thin fetch wrapper with auth token support

// Base URL: use env var in production, fallback to localhost in dev
let BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
if (BASE_URL.endsWith("/")) BASE_URL = BASE_URL.slice(0, -1);
if (!BASE_URL.endsWith("/api")) BASE_URL += "/api";

const getHeaders = (token) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/**
 * Core fetch helper — throws on non-OK responses with a readable message.
 */
const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
};

export const api = {
  // ── Environments ──────────────────────────────────────────────────────────

  getEnvironments: (token) =>
    apiFetch(`${BASE_URL}/environments`, { headers: getHeaders(token) }),

  getEnvironment: (token, envId) =>
    apiFetch(`${BASE_URL}/environments/${envId}`, { headers: getHeaders(token) }),

  createEnvironment: (token, name) =>
    apiFetch(`${BASE_URL}/environments`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ name }),
    }),

  renameEnvironment: (token, envId, name) =>
    apiFetch(`${BASE_URL}/environments/${envId}`, {
      method: "PUT",
      headers: getHeaders(token),
      body: JSON.stringify({ name }),
    }),

  deleteEnvironment: (token, envId) =>
    apiFetch(`${BASE_URL}/environments/${envId}`, {
      method: "DELETE",
      headers: getHeaders(token),
    }),

  // ── Screens ───────────────────────────────────────────────────────────────

  getScreensForEnvironment: (token, environmentId) =>
    apiFetch(`${BASE_URL}/screens/env/${environmentId}`, {
      headers: getHeaders(token),
    }),

  generatePairingCode: () =>
    apiFetch(`${BASE_URL}/screens/generate-pairing-code`, { method: "POST" }),

  checkPairingStatus: (codeId) =>
    apiFetch(`${BASE_URL}/screens/check-pairing/${codeId}`),

  pairScreen: (token, pairingCode, envId, name) =>
    apiFetch(`${BASE_URL}/screens/pair`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ pairingCode, envId, name }),
    }),

  removeScreen: (token, screenId) =>
    apiFetch(`${BASE_URL}/screens/${screenId}`, {
      method: "DELETE",
      headers: getHeaders(token),
    }),
};
