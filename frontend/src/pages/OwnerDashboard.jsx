import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../api/axiosClient";
import LocationPicker from "../components/LocationPicker";

const ORDER_NEXT_STEPS = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const STATUS_TEXT = { open: "text-pulse", closed: "text-coral" };
const STATUS_DOT = { open: "bg-pulse animate-pulse-beat", closed: "bg-coral" };

export default function OwnerDashboard() {
  const [shops, setShops] = useState([]);
  const [activeShopId, setActiveShopId] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
  default_open_time: "09:00",
  default_close_time: "20:00",
});

const [savingSchedule, setSavingSchedule] = useState(false);

  const [showNewShopForm, setShowNewShopForm] = useState(false);
  const [shopForm, setShopForm] = useState({
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  contact_number: "",
  default_open_time: "09:00",
  default_close_time: "20:00",
});

  const [submittingShop, setSubmittingShop] = useState(false);

  const [productForm, setProductForm] = useState({ name: "", price: "", availability_status: "available" });
  const [submittingProduct, setSubmittingProduct] = useState(false);

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/shops/mine");

console.log("MY SHOPS API RESPONSE:", data);
console.log("SHOP STATUS:", data.shops?.[0]?.current_status);
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

  const loadShopData = useCallback(async () => {
    if (!activeShopId) return;
    try {
      const [productsRes, ordersRes] = await Promise.all([
        apiClient.get("/products/mine"),
        apiClient.get(`/orders/shop/${activeShopId}`),
      ]);
      setProducts((productsRes.data.products || []).filter((p) => p.shop_id === activeShopId));
      setOrders(ordersRes.data.orders || []);
    } catch (err) {
      // non-fatal — keep whatever we last had rather than wiping the screen
    }
  }, [activeShopId]);

  useEffect(() => {
    loadShopData();
  }, [loadShopData]);

  useEffect(() => {
    if (!activeShopId) return;
    const interval = setInterval(loadShopData, 25000);
    return () => clearInterval(interval);
  }, [activeShopId, loadShopData]);

  useEffect(() => {
  const shop = shops.find((s) => s.shop_id === activeShopId);

  if (!shop) return;

  setScheduleForm({
    default_open_time: String(shop.default_open_time || "09:00").slice(0, 5),
    default_close_time: String(shop.default_close_time || "20:00").slice(0, 5),
  });
}, [shops, activeShopId]);

  const activeShop = shops.find((s) => s.shop_id === activeShopId);

  async function handleCreateShop(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!shopForm.latitude || !shopForm.longitude) {
      setError("Please set your shop's location on the map before submitting.");
      return;
    }
    setSubmittingShop(true);
    try {
      await apiClient.post("/shops", {
  name: shopForm.name,
  address: shopForm.address,
  latitude: parseFloat(shopForm.latitude),
  longitude: parseFloat(shopForm.longitude),
  contact_number: shopForm.contact_number,
  default_open_time: shopForm.default_open_time,
  default_close_time: shopForm.default_close_time,
});
      setMessage("Shop registered successfully.");
      setShowNewShopForm(false);
      setShopForm({
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  contact_number: "",
  default_open_time: "09:00",
  default_close_time: "20:00",
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
async function saveSchedule() {
  if (!activeShop) return;

  setError("");
  setMessage("");
  setSavingSchedule(true);

  try {
    await apiClient.patch(`/shops/${activeShop.shop_id}`, {
      default_open_time: scheduleForm.default_open_time,
      default_close_time: scheduleForm.default_close_time,
    });

    setMessage("Shop schedule updated successfully.");

    await loadShops();
  } catch (err) {
    setError(err.response?.data?.message || "Could not update shop schedule.");
  } finally {
    setSavingSchedule(false);
  }
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

  async function handleAddProduct(e) {
    e.preventDefault();
    setError("");
    if (!productForm.name.trim() || !productForm.price) {
      setError("Product name and price are required.");
      return;
    }
    setSubmittingProduct(true);
    try {
      await apiClient.post("/products", {
        shop_id: activeShopId,
        name: productForm.name,
        price: parseFloat(productForm.price),
        availability_status: productForm.availability_status,
      });
      setProductForm({ name: "", price: "", availability_status: "available" });
      loadShopData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add the product.");
    } finally {
      setSubmittingProduct(false);
    }
  }

  async function updateProductStatus(productId, availability_status) {
    setError("");
    try {
      await apiClient.patch(`/products/${productId}`, { availability_status });
      loadShopData();
    } catch (err) {
      setError("Could not update product status.");
    }
  }

  async function deleteProduct(productId, productName) {
    if (!window.confirm(`Delete "${productName}"? This can't be undone.`)) return;
    setError("");
    try {
      await apiClient.delete(`/products/${productId}`);
      loadShopData();
    } catch (err) {
      setError("Could not delete the product.");
    }
  }

  async function advanceOrder(orderId, newStatus) {
    if (newStatus === "cancelled" && !window.confirm("Cancel this order? The customer will see it as cancelled.")) {
      return;
    }
    setError("");
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: newStatus });
      loadShopData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update order status.");
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
          <div className="w-full max-w-[380px] bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6 text-center">
            <h2 className="font-display font-semibold text-ink text-xl">No shops yet</h2>
            <p className="text-ink-soft text-[13.5px] my-2.5 mb-[18px]">Register your first shop to get started.</p>
            <button
              onClick={() => setShowNewShopForm(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
            >
              Register a shop
            </button>
          </div>  
        </div>
      </div>
    );
  }

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

      {message && (
        <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{message}</div>
      )}
      {error && <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{error}</div>}

      {showNewShopForm && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6 mb-6">
          <h3 className="font-display font-semibold text-ink text-base mb-3.5">Register a new shop</h3>
          <form onSubmit={handleCreateShop}>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Shop name</label>
              <input
                value={shopForm.name}
                onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              />
            </div>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Address</label>
              <input
                value={shopForm.address}
                onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
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
                className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
  <div>
    <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
      Opening time
    </label>
    <input
      type="time"
      value={shopForm.default_open_time}
      onChange={(e) =>
        setShopForm({
          ...shopForm,
          default_open_time: e.target.value,
        })
      }
      required
      className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
    />
  </div>

  <div>
    <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
      Closing time
    </label>
    <input
      type="time"
      value={shopForm.default_close_time}
      onChange={(e) =>
        setShopForm({
          ...shopForm,
          default_close_time: e.target.value,
        })
      }
      required
      className="w-full px-3 py-2.5 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
    />
  </div>
</div>
            <button
              type="submit"
              disabled={submittingShop}
              className="w-full inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm cursor-pointer hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed transition"
            >
              {submittingShop ? "Registering..." : "Register shop"}
            </button>
          </form>
        </div>
      )}

      {activeShop && (
        <>
          <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6 flex items-center gap-3 flex-wrap mb-6">
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
                <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6 mb-6">
  <h2 className="font-display font-semibold text-ink text-[15px] mb-3">
    Shop schedule
  </h2>

  <div className="flex gap-3 flex-wrap items-end">
    <div>
      <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
        Opening time
      </label>
      <input
        type="time"
        value={scheduleForm.default_open_time}
        onChange={(e) =>
          setScheduleForm((prev) => ({
            ...prev,
            default_open_time: e.target.value,
          }))
        }
        className="px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
      />
    </div>

    <div>
      <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
        Closing time
      </label>
      <input
        type="time"
        value={scheduleForm.default_close_time}
        onChange={(e) =>
          setScheduleForm((prev) => ({
            ...prev,
            default_close_time: e.target.value,
          }))
        }
        className="px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
      />
    </div>

    <button
      type="button"
      onClick={saveSchedule}
      disabled={savingSchedule}
      className="inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm cursor-pointer hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed transition"
    >
      {savingSchedule ? "Saving..." : "Save schedule"}
    </button>
  </div>
</div>
          <h2 className="font-display font-semibold text-ink text-[15px] mb-3">Products</h2>
          <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6 mb-3">
            <form onSubmit={handleAddProduct} className="flex gap-2.5 flex-wrap items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Product name</label>
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
                />
              </div>
              <div className="w-[110px]">
                <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
                />
              </div>
              <div className="w-[150px]">
                <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Status</label>
                <select
                  value={productForm.availability_status}
                  onChange={(e) => setProductForm({ ...productForm, availability_status: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
                >
                  <option value="available">Available</option>
                  <option value="few_left">Few left</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submittingProduct}
                className="inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm cursor-pointer hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed transition"
              >
                {submittingProduct ? "Adding..." : "Add product"}
              </button>
            </form>
          </div>

          <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6">
            {products.length === 0 && (
              <p className="text-ink-soft text-[13.5px]">
                No products yet — add one above, or ask an admin to bulk-upload your catalog.
              </p>
            )}
            {products.length > 0 && (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Name</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Price</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Status</th>
                    <th className="border-b border-border"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.product_id}>
                      <td className="py-2.5 pr-2 border-b border-border">{p.name}</td>
                      <td className="py-2.5 pr-2 border-b border-border font-mono">₹{p.price}</td>
                      <td className="py-2.5 pr-2 border-b border-border">
                        <select
                          value={p.availability_status}
                          onChange={(e) => updateProductStatus(p.product_id, e.target.value)}
                          className="px-2 py-1.5 rounded-md border border-border bg-bg text-ink text-sm"
                        >
                          <option value="available">Available</option>
                          <option value="few_left">Few left</option>
                          <option value="out_of_stock">Out of stock</option>
                        </select>
                      </td>
                      <td className="py-2.5 border-b border-border">
                        <button
                          onClick={() => deleteProduct(p.product_id, p.name)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-transparent text-ink font-semibold text-[13px] cursor-pointer hover:border-ink-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <h2 className="font-display font-semibold text-ink text-[15px] mt-7 mb-3">Incoming orders</h2>
          <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6">
            {orders.length === 0 && <p className="text-ink-soft text-[13.5px]">No orders yet.</p>}
            {orders.length > 0 && (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Product</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Qty</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Customer</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Status</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Next step</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.order_id}>
                      <td className="py-2.5 pr-2 border-b border-border">{o.product_name}</td>
                      <td className="py-2.5 pr-2 border-b border-border">{o.quantity}</td>
                      <td className="py-2.5 pr-2 border-b border-border">
                        {o.customer_name}
                        <br />
                        <span className="text-ink-soft text-[13.5px]">{o.delivery_address}</span>
                      </td>
                      <td className="py-2.5 pr-2 border-b border-border font-mono">{o.status.replace("_", " ")}</td>
                      <td className="py-2.5 border-b border-border">
                        {ORDER_NEXT_STEPS[o.status]?.length > 0 ? (
                          <div className="flex gap-1.5">
                            {ORDER_NEXT_STEPS[o.status].map((next) => (
                              <button
                                key={next}
                                onClick={() => advanceOrder(o.order_id, next)}
                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-[13px] cursor-pointer transition ${
                                  next === "cancelled"
                                    ? "border border-border bg-transparent text-ink hover:border-ink-soft"
                                    : "bg-pulse text-white hover:opacity-90"
                                }`}
                              >
                                {next.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-ink-soft text-[13.5px]">Final</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}