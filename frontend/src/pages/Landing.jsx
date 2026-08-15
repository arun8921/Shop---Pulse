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
      <div className="relative bg-surface rounded-[24px] h-[340px] md:h-[380px] w-full flex flex-col items-center justify-center text-center overflow-hidden border border-border shadow-lg shadow-black/5">
        <div className="w-12 h-12 bg-pulse-soft rounded-full flex items-center justify-center mb-4">
          <MapPin size={24} strokeWidth={2} className="text-pulse animate-bounce" />
        </div>
        <p className="font-mono text-ink-soft font-medium text-[14px]">Acquiring live location...</p>
      </div>
    );
  }

  return (
    <div className="relative bg-surface rounded-[24px] h-[340px] md:h-[380px] w-full overflow-hidden border border-border shadow-lg shadow-black/5 [&_.leaflet-container]:rounded-[24px]">
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
                  <div className="text-center font-sans">
                    <strong className="block text-[14px] text-ink mb-1">{shop.name}</strong>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${shop.current_status === 'open' ? 'bg-pulse-soft text-pulse' : 'bg-coral-soft text-coral'}`}>
                      {shop.current_status === "open" ? "Open now" : "Closed"}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )
        )}
      </MapContainer>
      {shops.length === 0 && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-center z-[1000] pointer-events-none">
          <div className="bg-ink/90 backdrop-blur text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg">
            No registered shops near you yet — be the first!
          </div>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[40px] lg:gap-[60px] items-center py-12 md:py-[80px]">
          <div className="flex flex-col items-start text-left">
            <h1 className="font-display font-bold text-ink text-[40px] md:text-[52px] leading-[1.1] tracking-tight">
              Discover nearby shops, live.
            </h1>
            <p className="text-ink-soft text-[17px] md:text-[19px] mt-6 mb-8 max-w-[480px] leading-relaxed">
              Shop-Pulse connects you with local shops in real time — check who's open,
              what's in stock, and order in a few taps. Built for independent shops,
              not warehouses.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-pulse text-white font-bold text-[15px] hover:bg-emerald-600 transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-pulse/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Get started
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-surface border border-border text-ink font-bold text-[15px] hover:border-pulse hover:text-pulse transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Learn more
              </a>
            </div>
          </div>

          <div className="w-full">
            <HeroMap />
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-5 mt-[70px]" id="features">
        <h2 className="font-display font-semibold text-ink text-2xl mb-1.5">Built around one simple idea</h2>
        <p className="text-ink-soft text-[13.5px] mb-7">
          Know before you go — is it open, is it in stock, and how far is it.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow p-[24px]">
              <Icon size={32} strokeWidth={1.6} className="text-pulse" />
              <h3 className="text-[17px] font-bold text-ink mt-4 mb-2">{title}</h3>
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
            <div key={a.title} className="card">
              <h3 className="text-base text-ink mb-3.5">{a.title}</h3>
              <ul className="list-none p-0 m-0">
                {a.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-ink mb-2.5">
                    <CheckCircle2 size={16} strokeWidth={1.8} color="#10B981" className="flex-shrink-0 mt-px" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-pulse py-16 px-5 text-center mt-[70px] mx-4 rounded-[32px] mb-8 shadow-xl shadow-pulse/10 max-w-[1200px] xl:mx-auto">
        <h2 className="text-white text-[32px] font-display font-bold">Ready to find what's open?</h2>
        <p className="text-white/90 text-lg mt-3 mb-[28px] max-w-lg mx-auto">
          Join Shop-Pulse and discover the shops around you today.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center justify-center gap-1.5 px-8 py-3.5 rounded-xl bg-white text-pulse font-bold text-[15px] hover:scale-105 hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-pulse"
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