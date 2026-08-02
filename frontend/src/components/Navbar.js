import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Compass, LayoutDashboard, LogOut, PackageSearch, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const PILL_STYLES = {
  owner: "bg-slate-soft text-slate",
  customer: "bg-pulse-soft text-pulse",
  admin: "bg-amber-soft text-amber",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="border-b border-border bg-surface">
      <div className="flex items-center justify-between px-5 py-3.5 max-w-[1100px] mx-auto">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-[19px] text-ink">
          <span className="w-2.5 h-2.5 rounded-full bg-pulse animate-pulse-beat" aria-hidden="true"></span>
          Shop-Pulse
        </Link>

        <div className="flex items-center gap-[18px] text-sm text-ink-soft">
          {!user && (
            <>
              <Link to="/login" className="hover:text-ink transition">
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-slate text-white font-semibold text-sm hover:opacity-90 transition"
              >
                Sign up
              </Link>
            </>
          )}

          {user && user.role === "owner" && (
            <>
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 hover:text-ink transition">
                <LayoutDashboard size={16} /> <span>Dashboard</span>
              </Link>
              <span className={`font-mono text-[11px] px-[9px] py-[3px] rounded-full uppercase tracking-wide ${PILL_STYLES.owner}`}>
                Owner
              </span>
              <span className="text-ink-soft">{user.name}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-ink-soft hover:text-ink transition"
              >
                <LogOut size={16} /> <span>Log out</span>
              </button>
            </>
          )}

          {user && user.role === "customer" && (
            <>
              <Link to="/discover" className="inline-flex items-center gap-1.5 hover:text-ink transition">
                <Compass size={16} /> <span>Discover</span>
              </Link>
              <Link to="/my-orders" className="inline-flex items-center gap-1.5 hover:text-ink transition">
                <PackageSearch size={16} /> <span>Orders</span>
              </Link>
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 hover:text-ink transition">
                <LayoutDashboard size={16} /> <span>Dashboard</span>
              </Link>
              <span className={`font-mono text-[11px] px-[9px] py-[3px] rounded-full uppercase tracking-wide ${PILL_STYLES.customer}`}>
                Customer
              </span>
              <span className="text-ink-soft">{user.name}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-ink-soft hover:text-ink transition"
              >
                <LogOut size={16} /> <span>Log out</span>
              </button>
            </>
          )}

          {user && user.role === "admin" && (
            <>
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 hover:text-ink transition">
                <ShieldCheck size={16} /> <span>Admin panel</span>
              </Link>
              <span className={`font-mono text-[11px] px-[9px] py-[3px] rounded-full uppercase tracking-wide ${PILL_STYLES.admin}`}>
                Admin
              </span>
              <span className="text-ink-soft">{user.name}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-ink-soft hover:text-ink transition"
              >
                <LogOut size={16} /> <span>Log out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}