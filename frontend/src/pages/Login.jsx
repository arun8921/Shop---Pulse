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
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-[380px] bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6">
        <h1 className="font-display font-semibold text-ink text-[28px] leading-tight tracking-[-0.01em] mb-1">
          Welcome back
        </h1>
        <p className="text-ink-soft text-[13.5px] mb-5">Log in to Shop-Pulse</p>

        {error && (
          <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-[13px] font-medium text-ink-soft mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
            />
          </div>

          <div className="mb-4">
             <label htmlFor="password" className="block text-[13px] font-medium text-ink-soft">
                Password
              </label>
            
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
            />
              <Link to="/forgot-password" className="text-[12.5px] text-slate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
                Forgot password?
              </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm cursor-pointer transition hover:opacity-90 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-ink-soft text-[13.5px] mt-4 text-center">
          Don't have an account?{" "}
          <Link to="/register" className="text-slate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}