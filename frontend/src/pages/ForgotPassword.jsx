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
    <div className="min-h-screen flex items-center justify-center bg-bg p-5">
      <div className="w-full max-w-[420px] bg-surface rounded-[20px] shadow-sm border border-border p-8 sm:p-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-10 font-display font-bold text-[20px] text-ink">
          <div className="w-8 h-8 rounded-lg bg-slate flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          </div>
          Shop Pulse
        </div>

        <div className="mx-auto w-12 h-12 bg-bg rounded-2xl flex items-center justify-center mb-6 text-slate">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>

        <h1 className="font-display font-semibold text-ink text-[28px] leading-tight tracking-[-0.02em] mb-2">
          Reset Your Password
        </h1>
        <p className="text-ink-soft text-[14px] mb-8 leading-relaxed max-w-[320px] mx-auto">
          Enter your registered email address and we'll send you recovery instructions.
        </p>

        {error && (
          <div className="bg-coral-soft text-coral rounded-lg px-4 py-3 text-[13.5px] mb-6 text-left">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-pulse-soft text-pulse rounded-lg px-4 py-3 text-[13.5px] mb-6 text-left">
            {message}
          </div>
        )}
        {devLink && (
          <div className="bg-amber-soft text-amber rounded-lg px-4 py-3 text-[12.5px] mb-6 break-words text-left">
            <strong>Dev only</strong> (no email server configured yet) — use this link directly:
            <br />
            <a href={devLink} className="underline font-mono break-all mt-1 inline-block">
              {devLink}
            </a>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="text-left">
            <div className="mb-6">
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
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 text-[15px]"
            >
              {submitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-slate text-[14px] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate rounded-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}