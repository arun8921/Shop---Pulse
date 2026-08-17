import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

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
      const errorMessage = err.response?.data?.message || err.message || "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-5">
      <div className="w-full max-w-[420px] bg-surface rounded-[20px] shadow-sm border border-border p-8 sm:p-10">
        <Link to="/" className="flex items-center gap-2 mb-8 font-display font-bold text-[22px] text-ink group hover:opacity-80 transition-opacity w-fit cursor-pointer">
          <Logo className="w-[34px] h-[34px] drop-shadow-md group-hover:scale-105 transition-transform" />
          Shop-Pulse
        </Link>

        <h1 className="font-display font-bold text-ink text-[32px] leading-tight mb-2">
          Create an account
        </h1>
        <p className="text-ink-soft text-[15px] mb-8">Join the ultimate neighborhood marketplace.</p>

        {error && (
          <div className="bg-coral-soft text-coral rounded-lg px-4 py-3 text-[13.5px] mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="name" className="block text-[13px] font-medium text-ink mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="John Doe"
              className="input-field"
            />
          </div>

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
              placeholder="name@example.com"
              className="input-field"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="block text-[13px] font-medium text-ink mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••••••"
              className="input-field"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="role" className="block text-[13px] font-medium text-ink mb-1.5">
              I am a
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="customer">Customer — browsing and ordering</option>
              <option value="owner">Shop Owner — listing my shop</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary py-3 text-[15px]"
          >
            {submitting ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-ink-soft text-[14px] mt-8 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-pulse font-bold hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse rounded-sm transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}