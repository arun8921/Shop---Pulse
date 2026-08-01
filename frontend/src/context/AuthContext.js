import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/axiosClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedUser = localStorage.getItem("shopPulseUser");
      const token = localStorage.getItem("shopPulseToken");

      if (!storedUser || !token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // The API is the source of truth for a remembered session. This also
        // avoids trusting a stale or manually edited localStorage profile.
        const { data } = await apiClient.get("/auth/me");
        if (isMounted) {
          localStorage.setItem("shopPulseUser", JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch (err) {
        // Invalid/expired credentials must not leave a protected UI visible.
        if (err.response && [401, 403].includes(err.response.status)) {
          localStorage.removeItem("shopPulseToken");
          localStorage.removeItem("shopPulseUser");
        } else {
          // A temporary network failure should not force a user to sign in
          // again; retain the last known profile until the next request.
          try {
            if (isMounted) setUser(JSON.parse(storedUser));
          } catch {
            localStorage.removeItem("shopPulseToken");
            localStorage.removeItem("shopPulseUser");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  async function login(email, password) {
    const { data } = await apiClient.post("/auth/login", { email, password });
    localStorage.setItem("shopPulseToken", data.token);
    localStorage.setItem("shopPulseUser", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password, role) {
    const { data } = await apiClient.post("/auth/register", { name, email, password, role });
    localStorage.setItem("shopPulseToken", data.token);
    localStorage.setItem("shopPulseUser", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function updateProfile(payload) {
    const { data } = await apiClient.patch("/auth/me", payload);
    localStorage.setItem("shopPulseUser", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("shopPulseToken");
    localStorage.removeItem("shopPulseUser");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
