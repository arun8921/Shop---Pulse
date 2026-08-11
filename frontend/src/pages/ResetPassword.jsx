import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "../api/axiosClient";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/auth/reset-password", { token, password });
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-[380px] bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.06)] p-6">
        <h1 className="font-display font-semibold text-ink text-[28px] leading-tight tracking-[-0.01em] mb-1">
          Set a new password
        </h1>
        <p className="text-ink-soft text-[13.5px] mb-5">Choose a new password for your account.</p>

        {error && (
          <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{error}</div>
        )}
        {message && (
          <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">
            {message} Redirecting to login…
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-[13px] font-medium text-ink-soft mb-1.5">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-ink-soft mb-1.5">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm cursor-pointer hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
            >
              {submitting ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        <p className="text-ink-soft text-[13.5px] mt-4 text-center">
          <Link to="/login" className="text-slate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}