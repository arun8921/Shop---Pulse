import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/axiosClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("shopPulseUser");
    const token = localStorage.getItem("shopPulseToken");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
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

  function logout() {
    localStorage.removeItem("shopPulseToken");
    localStorage.removeItem("shopPulseUser");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
