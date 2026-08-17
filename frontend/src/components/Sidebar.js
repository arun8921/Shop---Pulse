import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Compass, LayoutDashboard, PackageSearch, Search, ShoppingCart, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import Logo from "./Logo";

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user } = useAuth();
  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  const isActive = (path) => location.pathname === path;
  const isDashboard = location.pathname.includes("/dashboard") || location.pathname.includes("/admin");

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-[60] lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar Container */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-[70] lg:z-0
        w-[260px] bg-surface border-r border-border flex flex-col h-full shrink-0
        transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:-ml-[260px] lg:translate-x-0"}
      `}>
        <div className="h-[76px] flex lg:hidden items-center justify-between px-6 border-b border-border shrink-0">
          <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-[22px] text-ink group" onClick={() => window.innerWidth < 1024 && setIsOpen(false)}>
            <Logo className="w-9 h-9 drop-shadow-md group-hover:scale-105 transition-transform" />
            Shop-Pulse
          </Link>
          <button 
            className="lg:hidden p-2 -mr-2 text-ink-soft hover:bg-slate-soft/50 hover:text-slate rounded-full transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

      <div className="p-5 overflow-y-auto flex-1">
        <form onSubmit={handleSearch} className="w-full relative flex items-center mb-8">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={16} className="text-ink-soft" />
          </div>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-bg border border-border rounded-xl text-[13px] font-medium focus:outline-none focus:border-pulse focus:ring-[2px] focus:ring-pulse-soft transition-all placeholder:text-ink-soft/70"
          />
        </form>

        <nav className="flex flex-col gap-2.5">
          <Link 
            to="/" 
            onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive("/") || isActive("/discover") ? "bg-pulse text-white shadow-md shadow-pulse/20" : "text-ink-soft hover:bg-slate-soft/50 hover:text-ink"}`}
          >
            <Compass size={20} />
            Discover Shops
          </Link>

          {user && user.role === "customer" && (
            <>
              <Link 
                to="/my-orders" 
                onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive("/my-orders") ? "bg-pulse text-white shadow-md shadow-pulse/20" : "text-ink-soft hover:bg-slate-soft/50 hover:text-ink"}`}
              >
                <PackageSearch size={20} />
                My Orders
              </Link>
              <Link 
                to="/cart" 
                onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl font-bold transition-all ${isActive("/cart") ? "bg-pulse text-white shadow-md shadow-pulse/20" : "text-ink-soft hover:bg-slate-soft/50 hover:text-ink"}`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart size={20} />
                  Shopping Cart
                </div>
                {cartCount > 0 && (
                  <span className="bg-pulse text-[var(--color-btn-text)] text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            </>
          )}

          {user && (user.role === "owner" || user.role === "admin") && (
            <Link 
              to="/dashboard" 
              onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isDashboard ? "bg-pulse text-white shadow-md shadow-pulse/20" : "text-ink-soft hover:bg-slate-soft/50 hover:text-ink"}`}
            >
              {user.role === "admin" ? <ShieldCheck size={20} /> : <LayoutDashboard size={20} />}
              Dashboard
            </Link>
          )}
        </nav>
      </div>
    </div>
    </>
  );
}
