import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="center-screen" style={{ flexDirection: "column", gap: 8 }}>
      <h1>Page not found</h1>
      <p className="muted">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary" style={{ width: "auto", marginTop: 12 }}>Back to home</Link>
    </div>
  );
}
