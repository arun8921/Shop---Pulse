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
  { icon: MapPin, title: "GPS Discovery", description: "Find shops near you within a chosen radius, instantly, using your live location." },
  { icon: ShoppingBag, title: "Live Availability", description: "See real open/closed status and product stock — available, few left, or out of stock." },
  { icon: Bell, title: "Order Tracking", description: "Place an order and follow it through placed, confirmed, out for delivery, and delivered." },
  { icon: Star, title: "Reviews & Trust", description: "Read and leave reviews so good shops get discovered and stay accountable." },
];

const AUDIENCES = [
  { title: "For Customers", items: ["Find open shops near you instantly", "Check product availability and prices", "Place orders and track delivery status", "Read and write shop reviews"] },
  { title: "For Shop Owners", items: ["Register your shop with a location on the map", "Toggle live open/closed status anytime", "Manage products and stock in one dashboard", "Confirm and fulfil incoming orders"] },
  { title: "For Admins", items: ["Verify new shop registrations", "Bulk-upload a shop's product catalog via CSV", "Keep the shop directory accurate and trustworthy"] },
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
      <div className="relative bg-slate-soft rounded-2xl h-[280px] flex flex-col items-center justify-center text-center overflow-hidden">
        <MapPin size={40} strokeWidth={1.5} color="#2A4B7C" />
        <p className="font-mono text-ink-soft text-[13.5px] mt-3">Locating you...</p>
      </div>
    );
  }

  return (
    <div className="relative bg-slate-soft rounded-2xl h-[280px] overflow-hidden [&_.leaflet-container]:rounded-2xl">
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
        <div className="absolute bottom-3 left-3 right-3 bg-white/95 rounded-md px-3 py-2 text-xs text-ink-soft text-left z-[1000] pointer-events-none">
          No registered shops near you yet — be the first!
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  return (
    <div>
      <div className="max-w-[1100px] mx-auto px-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[50px] items-center py-9 md:py-[60px]">
          <div>
            <h1 className="font-display font-semibold text-ink text-[32px] md:text-[42px] leading-[1.1]">
              Discover nearby shops, live.
            </h1>
            <p className="text-ink-soft text-base mt-3.5 mb-6 max-w-[440px]">
              Shop-Pulse connects you with local shops in real time — check who's open,
              what's in stock, and order in a few taps. Built for independent shops,
              not warehouses.
            </p>
            <div className="flex gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm hover:opacity-90 transition"
              >
                Get started
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md border border-border bg-transparent text-ink font-semibold text-sm hover:border-ink-soft transition"
              >
                Learn more
              </a>
            </div>
          </div>

          <HeroMap />
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-5 mt-[70px]" id="features">
        <h2 className="font-display font-semibold text-ink text-2xl mb-1.5">Built around one simple idea</h2>
        <p className="text-ink-soft text-[13.5px] mb-7">
          Know before you go — is it open, is it in stock, and how far is it.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-[22px]">
              <Icon size={26} strokeWidth={1.6} color="#2A4B7C" />
              <h3 className="text-base text-ink mt-3.5 mb-1.5">{title}</h3>
              <p className="text-ink-soft text-[13.5px]">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-5 mt-[70px]">
        <h2 className="font-display font-semibold text-ink text-2xl mb-1.5">Built for everyone in the loop</h2>
        <p className="text-ink-soft text-[13.5px] mb-7">
          Customers, shop owners, and admins each get exactly what they need.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6">
              <h3 className="text-base text-ink mb-3.5">{a.title}</h3>
              <ul className="list-none p-0 m-0">
                {a.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-ink mb-2.5">
                    <CheckCircle2 size={16} strokeWidth={1.8} color="#16A34A" className="flex-shrink-0 mt-px" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate py-14 px-5 text-center mt-[70px]">
        <h2 className="text-white text-[26px] font-display font-semibold">Ready to find what's open?</h2>
        <p className="text-white/85 mt-2 mb-[22px]">
          Join Shop-Pulse and discover the shops around you today.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-white text-slate font-semibold text-sm hover:opacity-90 transition"
        >
          Sign up now
        </Link>
      </div>

      <div className="text-center py-6 px-5">
        <p className="font-mono text-ink-soft text-xs">© 2026 Shop-Pulse. A mini project.</p>
      </div>
    </div>
  );
}