import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Compass, LayoutDashboard, LogOut, PackageCheck, PackageSearch, ShieldCheck, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const PILL_STYLES = {
  owner: "bg-slate-soft text-slate",
  customer: "bg-pulse-soft text-pulse",
  admin: "bg-amber-soft text-amber",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
           <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border bg-transparent text-ink-soft hover:text-ink hover:border-ink-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {!user && (
            <>
           
              <Link to="/login" className="hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-slate text-white font-semibold text-sm hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
              >
                Sign up
              </Link>
            </>
          )}

          {user && user.role === "owner" && (
            <>
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
                <LayoutDashboard size={16} /> <span>Dashboard</span>
              </Link>
              <span className={`font-mono text-[11px] px-[9px] py-[3px] rounded-full uppercase tracking-wide ${PILL_STYLES.owner}`}>
                Owner
              </span>
              <span className="text-ink-soft">{user.name}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-ink-soft hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm"
              >
                <LogOut size={16} /> <span>Log out</span>
              </button>
            </>
          )}

          {user && user.role === "customer" && (
            <>
              <Link to="/discover" className="inline-flex items-center gap-1.5 hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
                <Compass size={16} /> <span>Discover</span>
              </Link>
              <Link to="/my-orders" className="inline-flex items-center gap-1.5 hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
                <PackageSearch size={16} /> <span>Orders</span>
              </Link>
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
                <LayoutDashboard size={16} /> <span>Dashboard</span>
              </Link>
              <span className={`font-mono text-[11px] px-[9px] py-[3px] rounded-full uppercase tracking-wide ${PILL_STYLES.customer}`}>
                Customer
              </span>
              <span className="text-ink-soft">{user.name}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-ink-soft hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm"
              >
                <LogOut size={16} /> <span>Log out</span>
              </button>
            </>
          )}

          {user && user.role === "admin" && (
            <>
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
                <ShieldCheck size={16} /> <span>Admin panel</span>
              </Link>
              <span className={`font-mono text-[11px] px-[9px] py-[3px] rounded-full uppercase tracking-wide ${PILL_STYLES.admin}`}>
                Admin
              </span>
              <span className="text-ink-soft">{user.name}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-ink-soft hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm"
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