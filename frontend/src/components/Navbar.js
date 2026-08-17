import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Compass, LayoutDashboard, LogOut, PackageSearch, ShieldCheck, Search, ShoppingCart, ArrowLeft, Sun, Moon, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Logo from "./Logo";

export default function Navbar({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const isHomePage = location.pathname === "/" || location.pathname === "/discover" || location.pathname === "/dashboard" || location.pathname === "/owner/dashboard" || location.pathname === "/admin";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm">
      <div className="w-full px-4 md:px-6">
        
        {/* Desktop Navbar */}
        <div className="hidden lg:flex items-center justify-between h-[76px] gap-4">
          
          {/* LEFT: Back Button (if needed) & Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={toggleSidebar} 
              className="p-2 -ml-2 text-ink-soft hover:bg-slate-soft/50 hover:text-slate rounded-full transition-colors flex items-center justify-center border border-transparent hover:border-border"
              title="Toggle Sidebar"
            >
              <Menu size={20} strokeWidth={2.5} />
            </button>

            {!isHomePage && (
              <button 
                onClick={() => navigate(-1)} 
                className="p-2 -ml-1 text-ink-soft hover:bg-pulse-soft hover:text-pulse rounded-full transition-colors flex items-center justify-center border border-border bg-bg shadow-sm"
                title="Go Back"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-[22px] text-ink group ml-2">
              <Logo className="w-9 h-9 drop-shadow-md group-hover:scale-105 transition-transform" />
              Shop-Pulse
            </Link>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-4 shrink-0 ml-auto">
            <button onClick={toggleTheme} className="p-2.5 text-ink-soft hover:bg-slate-soft/50 hover:text-slate rounded-full transition-colors flex items-center justify-center border border-border bg-bg shadow-sm" title="Toggle Theme">
              {theme === 'dark' ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
            </button>
            
            {!user ? (
              <div className="flex items-center gap-4 pl-2 border-l border-border">
                <Link to="/login" className="text-[14px] font-bold text-ink-soft hover:text-pulse transition-colors px-2">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary py-2.5 px-5 rounded-full">
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4 pl-4 border-l border-border">
                <div className="flex flex-col items-end">
                  <span className="text-[14px] font-bold text-ink leading-tight">{user.name}</span>
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${
                    user.role === 'customer' ? 'text-pulse' : user.role === 'owner' ? 'text-slate' : 'text-amber'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <button onClick={handleLogout} className="p-2.5 text-ink-soft hover:text-coral hover:bg-coral-soft/50 rounded-full transition-colors border border-transparent hover:border-coral/20" title="Log out">
                  <LogOut size={18} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navbar */}
        <div className="lg:hidden py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleSidebar} 
                className="p-1 -ml-1 text-ink-soft hover:bg-slate-soft/50 hover:text-slate rounded-full transition-colors flex items-center justify-center"
              >
                <Menu size={22} strokeWidth={2.5} />
              </button>
              {!isHomePage && (
                <button 
                  onClick={() => navigate(-1)} 
                  className="p-1 -ml-1 text-ink-soft hover:bg-slate-soft/50 hover:text-slate rounded-full transition-colors flex items-center justify-center"
                >
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
              )}
              <Link to="/" className="flex items-center gap-2 font-display font-bold text-[20px] text-ink ml-1 group">
                <Logo className="w-7 h-7 drop-shadow-sm group-hover:scale-105 transition-transform" />
                Shop-Pulse
              </Link>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={toggleTheme} className="p-2 text-ink-soft hover:text-slate rounded-full transition-colors">
                {theme === 'dark' ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
              </button>
              {!user ? (
                <Link to="/login" className="text-sm font-semibold text-pulse px-2">Sign In</Link>
              ) : (
                <button onClick={handleLogout} className="text-ink-soft hover:text-coral p-2">
                  <LogOut size={20} />
                </button>
              )}
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="w-full relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-ink-soft" />
            </div>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border rounded-full text-[13px] focus:outline-none focus:border-pulse"
            />
          </form>

          {user && (
            <div className="flex items-center justify-around pt-1 border-t border-border mt-1">
              {user.role === "customer" && (
                <>
                  <Link to="/" className="flex flex-col items-center p-2 text-ink-soft hover:text-pulse">
                    <Compass size={20} />
                    <span className="text-[10px] mt-1 font-medium">Home</span>
                  </Link>
                  <Link to="/my-orders" className="flex flex-col items-center p-2 text-ink-soft hover:text-pulse">
                    <PackageSearch size={20} />
                    <span className="text-[10px] mt-1 font-medium">Orders</span>
                  </Link>
                </>
              )}
              {(user.role === "owner" || user.role === "admin") && (
                <Link to="/dashboard" className="flex flex-col items-center p-2 text-ink-soft hover:text-pulse">
                  <LayoutDashboard size={20} />
                  <span className="text-[10px] mt-1 font-medium">Dashboard</span>
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}