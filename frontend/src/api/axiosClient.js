import axios from "axios";

// Keep local development simple while allowing a deployed frontend to point at
// its own API without a source-code change.
const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("shopPulseToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
