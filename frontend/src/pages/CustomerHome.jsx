import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, Navigation, Store, Search, ChevronDown, Star, LayoutGrid, Clock } from "lucide-react";
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMap, useMapEvents, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import apiClient from "../api/axiosClient";

const searchCenterIcon = L.divIcon({
  className: "bg-transparent border-none",
  html: `
    <div style="display: flex; align-items: flex-end; justify-content: center;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="#3b82f6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.3));">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="white" stroke="none"></circle>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const createGlowingIcon = (isOpen) => {
  const color = isOpen ? '#10b981' : '#f43f5e'; // emerald-500 for open, rose-500 for closed
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `
      <div style="display: flex; align-items: flex-end; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="${color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.3));">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white" stroke="none"></circle>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  const [coords, setCoords] = useState(() => {
    const saved = sessionStorage.getItem("sp_coords");
    return saved ? JSON.parse(saved) : null;
  });
  const [myCoords, setMyCoords] = useState(() => {
    const saved = sessionStorage.getItem("sp_myCoords");
    return saved ? JSON.parse(saved) : null;
  });
  const [isManualLocation, setIsManualLocation] = useState(() => {
    return sessionStorage.getItem("sp_isManual") === "true";
  });
  const [radius, setRadius] = useState(() => {
    return Number(sessionStorage.getItem("sp_radius")) || 5;
  });
  
  const [shops, setShops] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);

  // Filters State
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState("nearest");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    if (coords) sessionStorage.setItem("sp_coords", JSON.stringify(coords));
  }, [coords]);
  
  useEffect(() => {
    if (myCoords) sessionStorage.setItem("sp_myCoords", JSON.stringify(myCoords));
  }, [myCoords]);

  useEffect(() => {
    sessionStorage.setItem("sp_isManual", String(isManualLocation));
  }, [isManualLocation]);

  useEffect(() => {
    sessionStorage.setItem("sp_radius", String(radius));
  }, [radius]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyCoords(here);
        setCoords(prev => {
          if (!prev || sessionStorage.getItem("sp_isManual") !== "true") {
            return here;
          }
          return prev;
        });
      },
      () => {
        setLocationDenied(true);
        const fallback = { lat: 9.9312, lng: 76.2673 }; // Kochi fallback
        setMyCoords(fallback);
        setCoords(prev => {
          if (!prev || sessionStorage.getItem("sp_isManual") !== "true") {
            return fallback;
          }
          return prev;
        });
      }
    );
  }, []);

  function handleMapClick(lat, lng) {
    setCoords({ lat, lng });
    setIsManualLocation(true);
  }

  function resetToMyLocation() {
    if (myCoords) {
      setCoords(myCoords);
      setIsManualLocation(false);
    }
  }

  const fetchData = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    setError("");
    try {
      if (urlQuery) {
        const { data } = await apiClient.get("/products/search", {
          params: { q: urlQuery, lat: coords.lat, lng: coords.lng, radius },
        });
        setSearchResults(data.results || []);
      } else {
        const { data } = await apiClient.get("/shops/nearby", {
          params: { lat: coords.lat, lng: coords.lng, radius },
        });
        setShops(data.shops || []);
        setSearchResults([]);
      }
    } catch (err) {
      setError("Could not load data. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [coords, radius, urlQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getProcessedShops = () => {
    let result = [...shops];
    if (filterOpenNow) result = result.filter(s => s.current_status === 'open');
    if (filterCategory) result = result.filter(s => s.business_category && s.business_category.includes(filterCategory));
    
    if (sortBy === 'rating') {
      result.sort((a, b) => (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0));
    } else {
      result.sort((a, b) => Number(a.distance_km) - Number(b.distance_km));
    }
    return result;
  };

  const getProcessedProducts = () => {
    let result = [...searchResults];
    if (filterOpenNow) result = result.filter(p => p.current_status === 'open' || !p.current_status);
    if (sortBy === 'nearest') {
      result.sort((a, b) => Number(a.distance_km) - Number(b.distance_km));
    }
    return result;
  };

  const processedShops = getProcessedShops();
  const processedProducts = getProcessedProducts();

  const getMapShops = () => {
    if (!urlQuery) return processedShops;
    
    const uniqueShops = new Map();
    processedProducts.forEach((p) => {
      if (!uniqueShops.has(p.shop_id) && p.latitude && p.longitude) {
        uniqueShops.set(p.shop_id, {
          shop_id: p.shop_id,
          name: p.shop_name,
          current_status: p.current_status,
          latitude: p.latitude,
          longitude: p.longitude,
        });
      }
    });
    return Array.from(uniqueShops.values());
  };

  const mapShopsToRender = getMapShops();

  return (
    <div className="w-full bg-bg min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 pt-6 flex flex-col gap-6">
        
        {/* TOP TOOLBAR */}
        <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
          {/* Location Picker */}
          <div className="flex items-center gap-3 bg-bg rounded-xl px-4 py-2 border border-border">
            <div className="w-8 h-8 rounded-full bg-pulse-soft flex items-center justify-center text-pulse shrink-0">
              <Navigation size={16} className="fill-pulse" />
            </div>
            <div 
              className="flex flex-col cursor-pointer pr-4"
              onClick={isManualLocation ? resetToMyLocation : undefined}
              title={isManualLocation ? "Click to reset to your location" : ""}
            >
              <span className="text-[9px] text-ink-soft uppercase tracking-wider font-bold mb-0.5"></span>
              <div className="flex items-center gap-2">
                <span className="text-ink font-semibold text-sm">
                  {locationDenied ? "Default Location" : isManualLocation ? "Selected Area (Map)" : "Current Location"}
                </span>
                <ChevronDown size={14} className="text-ink-soft" />
              </div>
            </div>
          </div>

          {/* Radius Slider */}
          <div className="flex items-center gap-4 w-full md:w-[400px] pr-2">
            <div className="w-full">
               <input 
                 type="range" min="1" max="10" step="1" 
                 value={radius} onChange={e => setRadius(Number(e.target.value))}
                 className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-pulse" 
               />
               <div className="flex justify-between text-[10px] text-ink-soft font-bold mt-2 px-1">
                 <span>&lt; 2 km</span>
                 <span>&lt; 5 km</span>
                 <span>&lt; 10 km</span>
               </div>
            </div>
          </div>
        </div>

        {/* FILTER BAR */}
        <div 
          className="flex items-center gap-3 overflow-x-auto pb-2" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
          
          <button 
            onClick={() => setFilterOpenNow(!filterOpenNow)}
            className={`flex items-center gap-2 border text-sm px-4 py-2 rounded-full shadow-sm font-medium transition-colors shrink-0
              ${filterOpenNow ? 'bg-pulse text-[var(--color-btn-text)] border-pulse' : 'bg-surface border-border text-ink hover:border-pulse'}
            `}
          >
            <Clock size={14} className={filterOpenNow ? 'text-[var(--color-btn-text)]' : 'text-pulse'} /> Open Now
          </button>

          <div className="relative shrink-0">
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="appearance-none bg-surface border border-border text-ink text-sm pl-4 pr-9 py-2 rounded-full shadow-sm hover:border-pulse focus:outline-none focus:border-pulse transition-colors font-medium cursor-pointer"
            >
              <option value="nearest">Nearest First</option>
              <option value="rating">Highest Rated</option>
            </select>
            <ChevronDown size={14} className="text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!urlQuery && (
            <div className="relative shrink-0">
              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                className="appearance-none bg-surface border border-border text-ink text-sm pl-4 pr-9 py-2 rounded-full shadow-sm hover:border-pulse focus:outline-none focus:border-pulse transition-colors font-medium cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="Grocery">Grocery</option>
                <option value="Bakery">Bakery</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Stationery">Stationery</option>
              </select>
              <ChevronDown size={14} className="text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 pb-12">
          
          {/* LEFT COLUMN: Shops List */}
          <div 
            className="w-full lg:w-[420px] flex flex-col gap-4 shrink-0 lg:h-[calc(100vh-320px)] overflow-y-auto pr-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display font-bold text-xl text-ink">
                {urlQuery ? `Results for "${urlQuery}"` : "Shops"}
              </h2>
              {urlQuery && (
                <button onClick={() => setSearchParams({})} className="text-xs font-bold text-pulse hover:text-emerald-700">
                  Clear Search
                </button>
              )}
            </div>
            
            {error && (
              <div className="bg-coral-soft text-coral border border-coral/20 rounded-xl px-4 py-3 text-sm font-medium">
                {error}
              </div>
            )}

            {loading ? (
              <div className="bg-surface border border-border rounded-2xl py-20 flex flex-col items-center justify-center text-ink-soft">
                <div className="w-8 h-8 border-4 border-border border-t-pulse rounded-full animate-spin mb-4"></div>
                <p className="font-semibold text-sm">Searching...</p>
              </div>
            ) : urlQuery ? (
              /* PRODUCT RESULTS */
              processedProducts.length === 0 ? (
                <div className="bg-surface border border-border rounded-2xl py-16 text-center shadow-sm">
                  <Search size={40} className="text-ink-soft/30 mx-auto mb-4" />
                  <p className="text-ink font-semibold">No products found</p>
                  <p className="text-ink-soft text-sm mt-1">Try expanding your search radius or changing filters.</p>
                </div>
              ) : (
                processedProducts.map((product) => {
                  const isOut = product.availability_status === 'out_of_stock';
                  return (
                    <div key={product.product_id} className="bg-surface border border-border rounded-2xl p-5 hover:border-pulse/30 transition-colors shadow-sm flex flex-col gap-3 group">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col items-start gap-1">
                          <h3 className="font-semibold text-ink text-sm leading-tight line-clamp-2">
                            {product.product_name}
                          </h3>
                          {isOut ? (
                            <span className="shrink-0 bg-coral-soft text-coral text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Out of Stock</span>
                          ) : product.availability_status === 'few_left' ? (
                            <span className="shrink-0 bg-amber-soft text-amber text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Few Left</span>
                          ) : (
                            <span className="shrink-0 bg-pulse-soft text-pulse text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">In Stock</span>
                          )}
                        </div>
                        <span className="shrink-0 font-bold text-ink text-sm">₹{product.price}</span>
                      </div>
                      
                      <div className="mt-auto pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-ink-soft text-xs font-medium mb-3 truncate">
                          <Store size={12} className="text-pulse/70" /> {product.shop_name} • {Number(product.distance_km).toFixed(1)} km away
                        </div>
                        <div className="flex justify-end">
                          <button 
                            onClick={() => navigate(`/shops/${product.shop_id}`)}
                            className="bg-pulse-soft hover:bg-pulse/20 text-pulse px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <LayoutGrid size={14} /> View Shop
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )
            ) : (
              /* SHOP RESULTS */
              processedShops.length === 0 ? (
                <div className="bg-surface border border-border rounded-2xl py-16 text-center shadow-sm">
                  <Store size={40} className="text-ink-soft/30 mx-auto mb-4" />
                  <p className="text-ink font-semibold">No shops found</p>
                  <p className="text-ink-soft text-sm mt-1">Try changing filters or your location.</p>
                </div>
              ) : (
                processedShops.map((shop) => (
                  <div key={shop.shop_id} className="bg-surface border border-border rounded-2xl p-5 hover:border-pulse/30 transition-colors cursor-pointer group shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1.5 items-start">
                        <h3 className="font-display font-bold text-lg text-ink leading-none">{shop.name}</h3>
                        {shop.business_category && (
                          <span className="bg-bg text-ink-soft text-[10px] font-bold px-2 py-0.5 rounded-full border border-border flex items-center gap-1">
                            {shop.business_category.includes('Grocery') ? '🥦' : shop.business_category.includes('Electronics') ? '⚡' : shop.business_category.includes('Bakery') ? '🥐' : '🏪'} {shop.business_category}
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${shop.current_status === 'open' ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.25)]' : 'bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-rose-500/30 text-rose-700 shadow-[0_0_12px_rgba(244,63,94,0.25)]'}`}>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${shop.current_status === 'open' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${shop.current_status === 'open' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'}`}></span>
                        </span>
                        {shop.current_status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-ink-soft text-xs font-medium">
                      <MapPin size={12} className="text-pulse/70" /> {Number(shop.distance_km).toFixed(1)} km away
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="fill-amber text-amber" />
                        <span className="text-ink font-bold text-sm">{Number(shop.average_rating || 0).toFixed(1)}</span>
                        <span className="text-ink-soft text-xs">({shop.review_count || 0} reviews)</span>
                      </div>
                      <button 
                        onClick={() => navigate(`/shops/${shop.shop_id}`)}
                        className="bg-pulse text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-pulse/20 hover:bg-emerald-500"
                      >
                        <LayoutGrid size={14} /> Browse Shop
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {/* RIGHT COLUMN: Interactive Map */}
          <div className="flex-1 lg:h-[calc(100vh-320px)] min-h-[400px] rounded-[24px] overflow-hidden border border-border relative bg-surface shadow-sm">
            {!coords ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface z-10">
                <div className="w-12 h-12 bg-pulse-soft rounded-full flex items-center justify-center mb-4">
                  <MapPin size={24} className="text-pulse animate-bounce" />
                </div>
                <p className="font-medium text-ink-soft">Acquiring location...</p>
              </div>
            ) : (
              <MapContainer center={[coords.lat, coords.lng]} zoom={13} style={{ height: "100%", width: "100%" }} className="z-0 [&_.leaflet-container]:rounded-[24px]">
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Street (Default)">
                    <TileLayer 
                      attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satellite">
                    <TileLayer 
                      attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' 
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Terrain">
                    <TileLayer 
                      attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
                      url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>
                <RecenterMap lat={coords.lat} lng={coords.lng} />
                <ClickToSearchHandler onPick={handleMapClick} />
                
                {/* Center marker */}
                <Marker position={[coords.lat, coords.lng]} icon={searchCenterIcon}>
                  <Popup>
                    <div className="text-center font-body text-ink font-bold">You Are Here</div>
                  </Popup>
                </Marker>

                {/* Radius Aura */}
                <Circle 
                  center={[coords.lat, coords.lng]} 
                  radius={radius * 1000} 
                  pathOptions={{ 
                    color: '#3b82f6', 
                    fillColor: '#3b82f6', 
                    fillOpacity: 0.15, 
                    weight: 2, 
                    dashArray: '5, 5' 
                  }} 
                />
                
                {/* Shop markers */}
                {mapShopsToRender.map(shop => {
                  if (!shop.latitude || !shop.longitude) return null;
                  return (
                    <Marker 
                      key={shop.shop_id}
                      position={[parseFloat(shop.latitude), parseFloat(shop.longitude)]}
                      icon={createGlowingIcon(shop.current_status === "open")}
                    >
                      <Popup>
                        <div className="text-center font-body">
                          <strong className="block text-[14px] text-ink mb-1">{shop.name}</strong>
                          <span className={`inline-flex items-center justify-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${shop.current_status === 'open' ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.25)]' : 'bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-rose-500/30 text-rose-700 shadow-[0_0_12px_rgba(244,63,94,0.25)]'}`}>
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${shop.current_status === 'open' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${shop.current_status === 'open' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'}`}></span>
                            </span>
                            {shop.current_status}
                          </span>
                          <br/>
                          <button 
                            onClick={() => navigate(`/shops/${shop.shop_id}`)}
                            className="mt-3 text-xs font-bold text-pulse hover:underline w-full"
                          >
                            View Shop
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
            
            {/* Map Overlay helper text */}
            <div className="absolute bottom-4 left-4 right-4 z-[400] pointer-events-none flex justify-center">
              <div className="bg-bg/90 border border-border backdrop-blur text-ink text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full shadow-lg">
                Click anywhere to change location
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
