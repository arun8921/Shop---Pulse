import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Compass, LayoutDashboard, LogOut, PackageSearch, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-dot" aria-hidden="true"></span>
          Shop-Pulse
        </Link>

        <div className="nav-links">
          {!user && (
            <>
              <Link to="/login">Log in</Link>
              <Link className="nav-cta" to="/register">Sign up</Link>
            </>
          )}

          {user && user.role === "owner" && (
            <>
              <Link className="nav-icon-link" to="/dashboard"><LayoutDashboard size={16} /> <span>Dashboard</span></Link>
              <span className="pill owner">Owner</span>
              <span className="nav-user-name">{user.name}</span>
              <button className="linklike nav-icon-link" onClick={handleLogout}><LogOut size={16} /> <span>Log out</span></button>
            </>
          )}

          {user && user.role === "customer" && (
            <>
              <Link className="nav-icon-link" to="/discover"><Compass size={16} /> <span>Discover</span></Link>
              <Link className="nav-icon-link" to="/my-orders"><PackageSearch size={16} /> <span>Orders</span></Link>
              <Link className="nav-icon-link" to="/dashboard"><LayoutDashboard size={16} /> <span>Dashboard</span></Link>
              <span className="pill customer">Customer</span>
              <span className="nav-user-name">{user.name}</span>
              <button className="linklike nav-icon-link" onClick={handleLogout}><LogOut size={16} /> <span>Log out</span></button>
            </>
          )}

          {user && user.role === "admin" && (
            <>
              <Link className="nav-icon-link" to="/dashboard"><ShieldCheck size={16} /> <span>Admin panel</span></Link>
              <span className="pill admin">Admin</span>
              <span className="nav-user-name">{user.name}</span>
              <button className="linklike nav-icon-link" onClick={handleLogout}><LogOut size={16} /> <span>Log out</span></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
