import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === "owner") navigate("/dashboard");
      else if (user.role === "admin") navigate("/admin");
      else navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-5">
      <div className="w-full max-w-[420px] bg-surface rounded-[20px] shadow-sm border border-border p-8 sm:p-10">
        <div className="flex items-center gap-2 mb-8 font-display font-bold text-[22px] text-ink">
          <div className="w-[34px] h-[34px] rounded-xl bg-pulse flex items-center justify-center shadow-md shadow-pulse/20">
            <span className="w-3 h-3 rounded-full bg-white animate-pulse-beat" aria-hidden="true"></span>
          </div>
          Shop-Pulse
        </div>

        <h1 className="font-display font-bold text-ink text-[32px] leading-tight mb-2">
          Welcome back
        </h1>
        <p className="text-ink-soft text-[15px] mb-8">Sign in to continue your curated shopping experience.</p>

        {error && (
          <div className="bg-coral-soft text-coral rounded-lg px-4 py-3 text-[13.5px] mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="email" className="block text-[13px] font-medium text-ink mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="name@example.com"
              className="input-field"
            />
          </div>

          <div className="mb-6">
             <div className="flex justify-between items-center mb-1.5">
               <label htmlFor="password" className="block text-[13px] font-medium text-ink">
                  Password
                </label>
               <Link to="/forgot-password" className="text-[13px] text-pulse font-semibold hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse rounded-sm">
                 Forgot Password?
               </Link>
             </div>
            
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary py-3 text-[15px]"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-ink-soft text-[14px] mt-8 text-center">
          Don't have an account?{" "}
          <Link to="/register" className="text-pulse font-bold hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse rounded-sm transition-colors">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}