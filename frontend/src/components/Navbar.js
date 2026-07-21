import React from "react";
import { Link, useNavigate } from "react-router-dom";
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
              <Link to="/register">Sign up</Link>
            </>
          )}

          {user && user.role === "owner" && (
            <>
              <span className="pill">Owner</span>
              <Link to="/dashboard">Dashboard</Link>
              <button className="linklike" onClick={handleLogout}>Log out</button>
            </>
          )}

          {user && user.role === "customer" && (
            <>
              <span className="pill">Customer</span>
              <Link to="/my-orders">My orders</Link>
              <span className="muted">{user.name}</span>
              <button className="linklike" onClick={handleLogout}>Log out</button>
            </>
          )}

          {user && user.role === "admin" && (
            <>
              <span className="pill">Admin</span>
              <span className="muted">{user.name}</span>
              <button className="linklike" onClick={handleLogout}>Log out</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
