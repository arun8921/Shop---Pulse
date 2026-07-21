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
    <div className="container">
      <h1 style={{ marginTop: 28 }}>Find what's open nearby</h1>
      <p className="muted">Live status and stock from shops around you.</p>

      {locationDenied && (
        <div className="error-banner" style={{ marginTop: 16 }}>
          Couldn't access your location, showing a default area instead. Enable location access for accurate results.
        </div>
      )}

      {isManualLocation && (
        <div className="success-banner" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Searching around a spot you picked on the map.</span>
          <button className="btn btn-outline btn-sm" onClick={resetToMyLocation}>Use my location instead</button>
        </div>
      )}

      <form onSubmit={handleProductSearch} className="search-bar">
        <div className="field">
          <label htmlFor="q">Search for a product</label>
          <input id="q" placeholder="e.g. rice, paracetamol, notebooks" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="field" style={{ flex: "0 0 140px" }}>
          <label htmlFor="radius">Radius</label>
          <select id="radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            <option value={1}>1 km</option>
            <option value={3}>3 km</option>
            <option value={5}>5 km</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit" style={{ width: "auto" }}>Search</button>
        {query && (
          <button type="button" className="btn btn-outline" onClick={clearSearch}>Clear</button>
        )}
      </form>

      {error && <div className="error-banner">{error}</div>}

      <div className="home-grid">
        <div className="shop-list">
          {loading && <p className="muted">Loading shops...</p>}
          {!loading && shops.length === 0 && (
            <div className="card empty-state">No shops found in this radius yet. Try a wider radius.</div>
          )}
          {shops.map((shop) => (
            <div key={shop.shop_id} className="card shop-card">
              <div className="shop-card-top">
                <div>
                  <div className="shop-name">{shop.name}</div>
                  <div className="muted">{shop.address}</div>
                </div>
                <div className={`status-row ${shop.current_status}`}>
                  <span className={`status-dot ${shop.current_status}`}></span>
                  {shop.current_status === "open" ? "Open now" : "Closed"}
                </div>
              </div>

              {shop.distance_km !== undefined && (
                <p className="mono muted" style={{ marginTop: 8, marginBottom: 8 }}>
                  {Number(shop.distance_km).toFixed(2)} km away
                </p>
              )}

              {shop.matched_product && (
                <div className="product-row" style={{ marginTop: 8 }}>
                  <span>{shop.matched_product.name}</span>
                  <span>
                    <span className="price">₹{shop.matched_product.price}</span>{" "}
                    <span className={`badge ${shop.matched_product.availability_status}`}>
                      {shop.matched_product.availability_status.replace("_", " ")}
                    </span>
                  </span>
                </div>
              )}

              <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => navigate(`/shops/${shop.shop_id}`)}>
                View shop
              </button>
            </div>
          ))}
        </div>

        <div className="map-wrap" style={{ position: "relative" }}>
          <span className="map-picker-hint" style={{ zIndex: 1000 }}>Click the map to search a different area</span>
          {coords && (
            <MapContainer center={[coords.lat, coords.lng]} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <RecenterMap lat={coords.lat} lng={coords.lng} />
              <ClickToSearchHandler onPick={handleMapClick} />
              {coords && (
                <Marker position={[coords.lat, coords.lng]} icon={searchCenterIcon}>
                  <Tooltip permanent direction="top" offset={[0, -30]} className="you-are-here-tooltip">
                    {isManualLocation ? "Searching from here" : "You are here"}
                  </Tooltip>
                  <Popup>{isManualLocation ? "Searching from here" : "You are here"}</Popup>
                </Marker>
              )}
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
