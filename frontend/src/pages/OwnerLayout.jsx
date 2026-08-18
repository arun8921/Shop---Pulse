import React, { useState, useEffect, useCallback } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import apiClient from "../api/axiosClient";
import LocationPicker from "../components/LocationPicker";
import { BUSINESS_CATEGORIES } from "../utils/categories";

const STATUS_TEXT = { open: "text-emerald-600 dark:text-emerald-400", closed: "text-coral" };
const STATUS_DOT = { open: "bg-emerald-500 animate-pulse", closed: "bg-coral" };

export default function OwnerLayout() {
  const [shops, setShops] = useState([]);
  const [activeShopId, setActiveShopId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  const [showNewShopForm, setShowNewShopForm] = useState(false);
  const [shopForm, setShopForm] = useState({
    name: "",
    business_category: "",
    business_sub_category: "",
    address: "",
    latitude: "",
    longitude: "",
    contact_number: "",
    default_open_time: "09:00",
    default_close_time: "20:00",
  });
  const [documentFile, setDocumentFile] = useState(null);
  const [submittingShop, setSubmittingShop] = useState(false);

  const location = useLocation();

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/shops/mine");
      setShops(data.shops || []);
      if (data.shops && data.shops.length > 0 && !activeShopId) {
        setActiveShopId(data.shops[0].shop_id);
      }
    } catch (err) {
      setError("Could not load your shops.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  const activeShop = shops.find((s) => s.shop_id === activeShopId);

  async function handleCreateShop(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!shopForm.latitude || !shopForm.longitude) {
      setError("Please set your shop's location on the map before submitting.");
      return;
    }
    if (!documentFile) {
      setError("Please upload a verification document (license / registration proof).");
      return;
    }
    setSubmittingShop(true);
    try {
      const formData = new FormData();
      formData.append("name", shopForm.name);
      formData.append("business_category", shopForm.business_category);
      formData.append("business_sub_category", shopForm.business_sub_category);
      formData.append("address", shopForm.address);
      formData.append("latitude", parseFloat(shopForm.latitude));
      formData.append("longitude", parseFloat(shopForm.longitude));
      formData.append("contact_number", shopForm.contact_number);
      formData.append("default_open_time", shopForm.default_open_time);
      formData.append("default_close_time", shopForm.default_close_time);
      formData.append("document", documentFile);
      await apiClient.post("/shops", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Shop registered successfully. It will be visible after admin verification.");
      setShowNewShopForm(false);
      setDocumentFile(null);
      setShopForm({
        name: "", business_category: "", business_sub_category: "", address: "",
        latitude: "", longitude: "", contact_number: "", default_open_time: "09:00", default_close_time: "20:00",
      });
      loadShops();
    } catch (err) {
      setError(err.response?.data?.message || "Could not register the shop.");
    } finally {
      setSubmittingShop(false);
    }
  }

  function handleLocationChange(lat, lng) {
    setShopForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setShopForm((f) => ({
        ...f,
        latitude: pos.coords.latitude.toFixed(6),
        longitude: pos.coords.longitude.toFixed(6),
      }));
    });
  }

  async function toggleStatus() {
    if (!activeShop) return;
    setError("");
    const newStatus = activeShop.current_status === "open" ? "closed" : "open";
    try {
      await apiClient.patch(`/shops/${activeShop.shop_id}/status`, { status: newStatus });
      setShops((prev) => prev.map((s) => (s.shop_id === activeShop.shop_id ? { ...s, current_status: newStatus } : s)));
    } catch (err) {
      setError("Could not update shop status.");
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-5">
        <p className="text-ink-soft text-[13.5px] mt-7">Loading dashboard...</p>
      </div>
    );
  }

  if (shops.length === 0 && !showNewShopForm) {
    return (
      <div className="max-w-[1100px] mx-auto px-5">
        {error && (
          <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mt-7">{error}</div>
        )}
        <div className="min-h-[60vh] flex items-center justify-center p-5">
          <div className="w-full max-w-[380px] card text-center">
            <h2 className="font-display font-semibold text-ink text-xl">No shops yet</h2>
            <p className="text-ink-soft text-[13.5px] my-2.5 mb-[18px]">Register your first shop to get started.</p>
            <button onClick={() => setShowNewShopForm(true)} className="w-full btn-primary">
              Register a shop
            </button>
          </div>  
        </div>
      </div>
    );
  }

  const tabs = [
    { label: "Overview", path: "/owner/dashboard" },
    { label: "Products", path: "/owner/products" },
    { label: "Orders", path: "/owner/orders" },
    { label: "Shop Settings", path: "/owner/settings" },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-5 pb-[60px]">
      <div className="flex justify-between items-center flex-wrap gap-3 mt-7 mb-5">
        <div>
          <h1 className="font-display font-semibold text-ink text-2xl">Owner Dashboard</h1>
          {shops.length > 1 && (
            <select
              value={activeShopId || ""}
              onChange={(e) => setActiveShopId(Number(e.target.value))}
              className="mt-2 px-2.5 py-1.5 rounded-md border border-border bg-bg text-ink"
            >
              {shops.map((s) => (
                <option key={s.shop_id} value={s.shop_id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => setShowNewShopForm((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-transparent text-ink font-semibold text-[13px] cursor-pointer hover:border-ink-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
        >
          {showNewShopForm ? "Cancel" : shops.length === 0 ? "+ Add a shop" : "+ Add another shop"}
        </button>
      </div>

      {message && <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{message}</div>}
      {error && <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{error}</div>}

      {showNewShopForm && (
        <div className="card mb-6">
          <h3 className="font-display font-semibold text-ink text-base mb-3.5">Register a new shop</h3>
          <form onSubmit={handleCreateShop}>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Shop name</label>
              <input
                value={shopForm.name}
                onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                required
                className="input-field"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Business Category</label>
                <select
                  value={shopForm.business_category}
                  onChange={(e) => setShopForm({ ...shopForm, business_category: e.target.value, business_sub_category: "" })}
                  required
                  className="input-field cursor-pointer"
                >
                  <option value="">Select a category</option>
                  {Object.keys(BUSINESS_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Sub-category</label>
                <select
                  value={shopForm.business_sub_category}
                  onChange={(e) => setShopForm({ ...shopForm, business_sub_category: e.target.value })}
                  required
                  disabled={!shopForm.business_category}
                  className="input-field cursor-pointer disabled:opacity-50"
                >
                  <option value="">Select a sub-category</option>
                  {shopForm.business_category && BUSINESS_CATEGORIES[shopForm.business_category].map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Address</label>
              <input
                value={shopForm.address}
                onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                className="input-field"
              />
            </div>

            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Shop location</label>
            <LocationPicker latitude={shopForm.latitude} longitude={shopForm.longitude} onChange={handleLocationChange} />

            <button
              type="button"
              onClick={useMyLocation}
              className="mb-4 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-transparent text-ink font-semibold text-[13px] cursor-pointer hover:border-ink-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
            >
              Use my current location instead
            </button>

            <div className="mb-4">
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Contact number</label>
              <input
                value={shopForm.contact_number}
                onChange={(e) => setShopForm({ ...shopForm, contact_number: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Opening time</label>
                <input
                  type="time"
                  value={shopForm.default_open_time}
                  onChange={(e) => setShopForm({ ...shopForm, default_open_time: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Closing time</label>
                <input
                  type="time"
                  value={shopForm.default_close_time}
                  onChange={(e) => setShopForm({ ...shopForm, default_close_time: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Verification document (license / registration proof)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setDocumentFile(e.target.files[0])}
                className="text-sm text-ink"
              />
              <p className="text-ink-soft text-[12px] mt-1">PDF, JPEG, PNG, or WebP — max 5 MB</p>
            </div>
            <button type="submit" disabled={submittingShop} className="w-full btn-primary">
              {submittingShop ? "Registering..." : "Register shop"}
            </button>
          </form>
        </div>
      )}

      {activeShop && !showNewShopForm && (
        <>
          {/* Verification Status Banners */}
          {activeShop.verification_status === "pending" && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⏳</span>
                <h3 className="font-display font-semibold text-amber-700 dark:text-amber-400 text-[15px]">Pending Verification</h3>
              </div>
              <p className="text-amber-600 dark:text-amber-300 text-[13.5px]">Your shop is awaiting admin review. Products, orders, and schedule management will be available once approved.</p>
            </div>
          )}
          {activeShop.verification_status === "rejected" && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">❌</span>
                <h3 className="font-display font-semibold text-red-700 dark:text-red-400 text-[15px]">Verification Rejected</h3>
              </div>
              {activeShop.verification_reason && (
                <p className="text-red-600 dark:text-red-300 text-[13.5px] mb-3"><strong>Reason:</strong> {activeShop.verification_reason}</p>
              )}
              <p className="text-red-600 dark:text-red-300 text-[13.5px]">Please go to Shop Settings to resubmit your document.</p>
            </div>
          )}

          {activeShop.verification_status === "approved" && (
            <div className="card flex items-center gap-3 flex-wrap mb-6">
              <span className="inline-flex items-center gap-[7px] text-emerald-600 font-semibold text-[13px]">✅ Verified & Live</span>
              <span className={`inline-flex items-center gap-[7px] font-mono text-[12.5px] ${STATUS_TEXT[activeShop.current_status]}`}>
                <span className={`inline-block w-[9px] h-[9px] rounded-full ${STATUS_DOT[activeShop.current_status]}`}></span>
                {activeShop.current_status === "open" ? "Currently open" : "Currently closed"}
              </span>
              <button
                onClick={toggleStatus}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-white font-semibold text-[13px] cursor-pointer hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 ${
                  activeShop.current_status === "open" ? "bg-coral" : "bg-pulse"
                }`}
              >
                Mark as {activeShop.current_status === "open" ? "closed" : "open"}
              </button>
            </div>
          )}

          {activeShop.verification_status === "approved" && (
            <>
              <div className="flex items-center gap-6 border-b border-border mb-6 overflow-x-auto hide-scrollbar">
                {tabs.map((tab) => {
                  const isActive = location.pathname === tab.path || location.pathname === tab.path + '/';
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      className={`py-3 text-[14px] font-semibold whitespace-nowrap transition-colors border-b-2 ${
                        isActive ? "border-pulse text-pulse" : "border-transparent text-ink-soft hover:text-ink"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>

              <Outlet context={{ activeShop, loadShops }} />
            </>
          )}

          {activeShop.verification_status !== "approved" && (
            <div className="card text-center py-10 mt-6">
              <p className="text-ink-soft">Shop management features will be unlocked once your shop is verified.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
