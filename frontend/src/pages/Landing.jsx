import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin, ShoppingBag, Bell, Star, CheckCircle2 } from "lucide-react";
import apiClient from "../api/axiosClient";

const openIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const closedIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
});

const FEATURES = [
  {
    icon: MapPin,
    title: "GPS Discovery",
    description: "Find shops near you within a chosen radius, instantly, using your live location.",
  },
  {
    icon: ShoppingBag,
    title: "Live Availability",
    description: "See real open/closed status and product stock — available, few left, or out of stock.",
  },
  {
    icon: Bell,
    title: "Order Tracking",
    description: "Place an order and follow it through placed, confirmed, out for delivery, and delivered.",
  },
  {
    icon: Star,
    title: "Reviews & Trust",
    description: "Read and leave reviews so good shops get discovered and stay accountable.",
  },
];

const AUDIENCES = [
  {
    title: "For Customers",
    items: [
      "Find open shops near you instantly",
      "Check product availability and prices",
      "Place orders and track delivery status",
      "Read and write shop reviews",
    ],
  },
  {
    title: "For Shop Owners",
    items: [
      "Register your shop with a location on the map",
      "Toggle live open/closed status anytime",
      "Manage products and stock in one dashboard",
      "Confirm and fulfil incoming orders",
    ],
  },
  {
    title: "For Admins",
    items: [
      "Verify new shop registrations",
      "Bulk-upload a shop's product catalog via CSV",
      "Keep the shop directory accurate and trustworthy",
    ],
  },
];

function HeroMap() {
  const [coords, setCoords] = useState(null);
  const [shops, setShops] = useState([]);

  useEffect(() => {
    const fallback = { lat: 9.9312, lng: 76.2673 };
    if (!navigator.geolocation) {
      setCoords(fallback);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(fallback)
    );
  }, []);

  useEffect(() => {
    if (!coords) return;
    apiClient
      .get("/shops/nearby", { params: { lat: coords.lat, lng: coords.lng, radius: 10 } })
      .then(({ data }) => setShops(data.shops || []))
      .catch(() => setShops([]));
  }, [coords]);

  if (!coords) {
    return (
      <div className="hero-visual">
        <MapPin size={40} strokeWidth={1.5} color="var(--color-slate)" />
        <p className="muted mono" style={{ marginTop: 12 }}>Locating you...</p>
      </div>
    );
  }

  return (
    <div className="hero-visual hero-map">
      <MapContainer center={[coords.lat, coords.lng]} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {shops.map(
          (shop) =>
            shop.latitude &&
            shop.longitude && (
              <Marker
                key={shop.shop_id}
                position={[parseFloat(shop.latitude), parseFloat(shop.longitude)]}
                icon={shop.current_status === "open" ? openIcon : closedIcon}
              >
                <Popup>
                  <strong>{shop.name}</strong>
                  <br />
                  {shop.current_status === "open" ? "Open now" : "Closed"}
                </Popup>
              </Marker>
            )
        )}
      </MapContainer>
      {shops.length === 0 && (
        <div className="hero-map-empty-note">
          <span className="mono">No registered shops near you yet — be the first!</span>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <div className="container">
        <div className="hero-grid">
          <div>
            <h1 className="hero-title">Discover nearby shops, live.</h1>
            <p className="muted" style={{ fontSize: 16, marginTop: 14, marginBottom: 26, maxWidth: 440 }}>
              Shop-Pulse connects you with local shops in real time — check who's open,
              what's in stock, and order in a few taps. Built for independent shops,
              not warehouses.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/register" className="btn btn-primary" style={{ width: "auto" }}>
                Get started
              </Link>
              <a href="#features" className="btn btn-outline">Learn more</a>
            </div>
          </div>

          <HeroMap />
        </div>
      </div>

      {/* Features */}
      <div className="container" id="features" style={{ marginTop: 70 }}>
        <h2 className="section-heading">Built around one simple idea</h2>
        <p className="muted" style={{ marginBottom: 30 }}>
          Know before you go — is it open, is it in stock, and how far is it.
        </p>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card feature-card">
              <Icon size={26} strokeWidth={1.6} color="var(--color-slate)" />
              <h3 style={{ fontSize: 16, marginTop: 14, marginBottom: 6 }}>{title}</h3>
              <p className="muted" style={{ fontSize: 13.5 }}>{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Audiences */}
      <div className="container" style={{ marginTop: 70 }}>
        <h2 className="section-heading">Built for everyone in the loop</h2>
        <p className="muted" style={{ marginBottom: 30 }}>
          Customers, shop owners, and admins each get exactly what they need.
        </p>
        <div className="audience-grid">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="card">
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>{a.title}</h3>
              <ul className="checklist">
                {a.items.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} strokeWidth={1.8} color="var(--color-pulse)" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="cta-banner" style={{ marginTop: 70 }}>
        <h2 style={{ color: "white", fontSize: 26 }}>Ready to find what's open?</h2>
        <p style={{ color: "rgba(255,255,255,0.85)", marginTop: 8, marginBottom: 22 }}>
          Join Shop-Pulse and discover the shops around you today.
        </p>
        <Link to="/register" className="btn" style={{ width: "auto", background: "white", color: "var(--color-slate)" }}>
          Sign up now
        </Link>
      </div>

      <div className="landing-footer">
        <p className="muted mono" style={{ fontSize: 12 }}>© 2026 Shop-Pulse. A mini project.</p>
      </div>
    </div>
  );
}
