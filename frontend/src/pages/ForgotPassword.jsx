import React, { useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/axiosClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevLink("");
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/auth/forgot-password", { email });
      setMessage(data.message);
      if (data.dev_reset_link) {
        setDevLink(data.dev_reset_link);
      }
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
          Forgot password?
        </h1>
        <p className="text-ink-soft text-[13.5px] mb-5">
          Enter your email and we'll send you a link to reset it.
        </p>

        {error && (
          <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{error}</div>
        )}
        {message && (
          <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{message}</div>
        )}
        {devLink && (
          <div className="bg-amber-soft text-amber rounded-md px-3.5 py-2.5 text-[12.5px] mb-4 break-words">
            <strong>Dev only</strong> (no email server configured yet) — use this link directly:
            <br />
            <a href={devLink} className="underline font-mono break-all">
              {devLink}
            </a>
          </div>
        )}

        {!message && (
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
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm cursor-pointer hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
            >
              {submitting ? "Sending..." : "Send reset link"}
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