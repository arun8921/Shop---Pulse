import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
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
const searchCenterIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  className: "search-center-marker",
});

const BADGE_STYLES = {
  available: "bg-pulse-soft text-pulse",
  out_of_stock: "bg-coral-soft text-coral",
  few_left: "bg-amber-soft text-amber",
};
const STATUS_TEXT = { open: "text-pulse", closed: "text-coral" };
const STATUS_DOT = { open: "bg-pulse animate-pulse-beat", closed: "bg-coral" };

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function ClickToSearchHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function CustomerHome() {
  const navigate = useNavigate();
  const [coords, setCoords] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [radius, setRadius] = useState(3);
  const [shops, setShops] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(here);
        setMyCoords(here);
      },
      () => {
        setLocationDenied(true);
        const fallback = { lat: 9.9312, lng: 76.2673 };
        setCoords(fallback);
        setMyCoords(fallback);
      }
    );
  }, []);

  function handleMapClick(lat, lng) {
    setCoords({ lat, lng });
    setIsManualLocation(true);
    setQuery("");
  }

  function resetToMyLocation() {
    if (myCoords) {
      setCoords(myCoords);
      setIsManualLocation(false);
      setQuery("");
    }
  }

  const fetchNearbyShops = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/shops/nearby", {
        params: { lat: coords.lat, lng: coords.lng, radius },
      });
      setShops(data.shops || []);
    } catch (err) {
      setError("Could not load nearby shops. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [coords, radius]);

  useEffect(() => {
    fetchNearbyShops();
  }, [fetchNearbyShops]);

  useEffect(() => {
    if (shops.length === 0) return;
    const ids = shops.map((s) => s.shop_id).join(",");
    const interval = setInterval(async () => {
      try {
        const { data } = await apiClient.get("/shops/status", { params: { ids } });
        setShops((prev) =>
          prev.map((shop) => {
            const updated = data.shops.find((s) => s.shop_id === shop.shop_id);
            return updated ? { ...shop, current_status: updated.current_status } : shop;
          })
        );
      } catch {
        // silent
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [shops.length, shops]);

  async function handleProductSearch(e) {
    e.preventDefault();
    if (!query.trim() || !coords) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/products/search", {
        params: { q: query, lat: coords.lat, lng: coords.lng, radius },
      });
      const seen = new Map();
      (data.results || []).forEach((r) => {
        seen.set(r.shop_id, {
          shop_id: r.shop_id,
          name: r.shop_name,
          address: r.address,
          current_status: r.current_status,
          distance_km: r.distance_km,
          latitude: r.latitude,
          longitude: r.longitude,
          matched_product: { name: r.product_name, price: r.price, availability_status: r.availability_status },
        });
      });
      setShops(Array.from(seen.values()));
    } catch (err) {
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setQuery("");
    fetchNearbyShops();
  }

  return (
    <div className="max-w-[1100px] mx-auto px-5">
      <h1 className="font-display font-semibold text-ink text-2xl mt-7">Find what's open nearby</h1>
      <p className="text-ink-soft text-[13.5px]">Live status and stock from shops around you.</p>

      {locationDenied && (
        <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mt-4">
          Couldn't access your location, showing a default area instead. Enable location access for accurate results.
        </div>
      )}

      {isManualLocation && (
        <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px] mt-4 flex justify-between items-center gap-3">
          <span>Searching around a spot you picked on the map.</span>
          <button
            onClick={resetToMyLocation}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-transparent text-ink font-semibold text-[13px] cursor-pointer hover:border-ink-soft transition whitespace-nowrap"
          >
            Use my location instead
          </button>
        </div>
      )}

      <form onSubmit={handleProductSearch} className="flex gap-2.5 flex-wrap items-end my-6">
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="q" className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Search for a product
          </label>
          <input
            id="q"
            placeholder="e.g. rice, paracetamol, notebooks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
          />
        </div>
        <div className="flex-none w-[140px]">
          <label htmlFor="radius" className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Radius
          </label>
          <select
            id="radius"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
          >
            <option value={1}>1 km</option>
            <option value={3}>3 km</option>
            <option value={5}>5 km</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition"
        >
          Search
        </button>
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md border border-border bg-transparent text-ink font-semibold text-sm cursor-pointer hover:border-ink-soft transition"
          >
            Clear
          </button>
        )}
      </form>

      {error && <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{error}</div>}

      <div className="grid grid-cols-1 min-[861px]:grid-cols-[380px_1fr] gap-5 items-start">
        <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
          {loading && <p className="text-ink-soft text-[13.5px]">Loading shops...</p>}
          {!loading && shops.length === 0 && (
            <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] text-center py-10 px-5 text-ink-soft">
              No shops found in this radius yet. Try a wider radius.
            </div>
          )}
          {shops.map((shop) => (
            <div key={shop.shop_id} className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-display font-semibold text-ink text-base">{shop.name}</div>
                  <div className="text-ink-soft text-[13.5px]">{shop.address}</div>
                </div>
                <div className={`inline-flex items-center gap-[7px] font-mono text-[12.5px] whitespace-nowrap ${STATUS_TEXT[shop.current_status]}`}>
                  <span className={`inline-block w-[9px] h-[9px] rounded-full ${STATUS_DOT[shop.current_status]}`}></span>
                  {shop.current_status === "open" ? "Open now" : "Closed"}
                </div>
              </div>

              {shop.distance_km !== undefined && (
                <p className="font-mono text-ink-soft text-[13.5px] mt-2 mb-2">
                  {Number(shop.distance_km).toFixed(2)} km away
                </p>
              )}

              {shop.matched_product && (
                <div className="flex justify-between items-center py-2.5 mt-2 text-sm border-t border-border">
                  <span>{shop.matched_product.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-medium">₹{shop.matched_product.price}</span>
                    <span
                      className={`inline-block font-mono text-[11px] px-[9px] py-[3px] rounded-full uppercase tracking-wide ${
                        BADGE_STYLES[shop.matched_product.availability_status]
                      }`}
                    >
                      {shop.matched_product.availability_status.replace("_", " ")}
                    </span>
                  </span>
                </div>
              )}

              <button
                onClick={() => navigate(`/shops/${shop.shop_id}`)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-transparent text-ink font-semibold text-[13px] cursor-pointer hover:border-ink-soft transition"
              >
                View shop
              </button>
            </div>
          ))}
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-border h-[620px] [&_.leaflet-container]:rounded-2xl">
          <span className="absolute top-2 left-2 z-[1000] bg-white/95 px-2.5 py-1 rounded-full text-xs text-ink-soft shadow-[0_1px_2px_rgba(28,28,30,0.06)]">
            Click the map to search a different area
          </span>
          {coords && (
            <MapContainer center={[coords.lat, coords.lng]} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <RecenterMap lat={coords.lat} lng={coords.lng} />
              <ClickToSearchHandler onPick={handleMapClick} />
              <Marker position={[coords.lat, coords.lng]} icon={searchCenterIcon}>
                <Tooltip permanent direction="top" offset={[0, -30]} className="you-are-here-tooltip">
                  {isManualLocation ? "Searching from here" : "You are here"}
                </Tooltip>
                <Popup>{isManualLocation ? "Searching from here" : "You are here"}</Popup>
              </Marker>
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
          )}
        </div>
      </div>
    </div>
  );
}