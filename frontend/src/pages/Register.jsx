import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await register(name, email, password, role);
      if (user.role === "owner") navigate("/dashboard");
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
          Create your account
        </h1>
        <p className="text-ink-soft text-[13.5px] mb-5">Join Shop-Pulse in a few seconds</p>

        {error && (
          <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-[13px] font-medium text-ink-soft mb-1.5">
              Full name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
            />
          </div>

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
              className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-[13px] font-medium text-ink-soft mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="role" className="block text-[13px] font-medium text-ink-soft mb-1.5">
              I am a
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
            >
              <option value="customer">Customer — browsing and ordering from shops</option>
              <option value="owner">Shop Owner — listing my shop and products</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm cursor-pointer transition hover:opacity-90 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-ink-soft text-[13.5px] mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-slate font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}