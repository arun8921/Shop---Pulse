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

export default function OwnerDashboard() {
  const [shops, setShops] = useState([]);
  const [activeShopId, setActiveShopId] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showNewShopForm, setShowNewShopForm] = useState(false);
  const [shopForm, setShopForm] = useState({ name: "", address: "", latitude: "", longitude: "", contact_number: "" });
  const [submittingShop, setSubmittingShop] = useState(false);

  const [productForm, setProductForm] = useState({ name: "", price: "", availability_status: "available" });
  const [submittingProduct, setSubmittingProduct] = useState(false);

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

  // Keep incoming orders reasonably fresh without requiring a manual action —
  // matches the same 25s polling pattern used elsewhere in the app.
  useEffect(() => {
    if (!activeShopId) return;
    const interval = setInterval(loadShopData, 25000);
    return () => clearInterval(interval);
  }, [activeShopId, loadShopData]);

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
      });
      setMessage("Shop registered successfully.");
      setShowNewShopForm(false);
      setShopForm({ name: "", address: "", latitude: "", longitude: "", contact_number: "" });
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

  if (loading) return <div className="container"><p className="muted" style={{ marginTop: 28 }}>Loading dashboard...</p></div>;

  if (shops.length === 0 && !showNewShopForm) {
    return (
      <div className="container">
        {error && <div className="error-banner" style={{ marginTop: 28 }}>{error}</div>}
        <div className="center-screen" style={{ minHeight: "60vh" }}>
          <div className="card auth-card" style={{ textAlign: "center" }}>
            <h2>No shops yet</h2>
            <p className="muted" style={{ margin: "10px 0 18px" }}>Register your first shop to get started.</p>
            <button className="btn btn-primary" onClick={() => setShowNewShopForm(true)}>Register a shop</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="dash-header" style={{ marginTop: 28 }}>
        <div>
          <h1>Owner Dashboard</h1>
          {shops.length > 1 && (
            <select
              value={activeShopId || ""}
              onChange={(e) => setActiveShopId(Number(e.target.value))}
              style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)" }}
            >
              {shops.map((s) => (
                <option key={s.shop_id} value={s.shop_id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setShowNewShopForm((v) => !v)}>
          {showNewShopForm ? "Cancel" : shops.length === 0 ? "+ Add a shop" : "+ Add another shop"}
        </button>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      {showNewShopForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 14 }}>Register a new shop</h3>
          <form onSubmit={handleCreateShop}>
            <div className="field">
              <label>Shop name</label>
              <input value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Address</label>
              <input value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} />
            </div>

            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-ink-soft)", marginBottom: 6 }}>
              Shop location
            </label>
            <LocationPicker latitude={shopForm.latitude} longitude={shopForm.longitude} onChange={handleLocationChange} />

            <button type="button" className="btn btn-outline btn-sm" onClick={useMyLocation} style={{ marginBottom: 16 }}>
              Use my current location instead
            </button>

            <div className="field">
              <label>Contact number</label>
              <input value={shopForm.contact_number} onChange={(e) => setShopForm({ ...shopForm, contact_number: e.target.value })} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submittingShop}>
              {submittingShop ? "Registering..." : "Register shop"}
            </button>
          </form>
        </div>
      )}

      {activeShop && (
        <>
          <div className="card toggle-row" style={{ marginBottom: 24 }}>
            <span className={`status-row ${activeShop.current_status}`}>
              <span className={`status-dot ${activeShop.current_status}`}></span>
              {activeShop.current_status === "open" ? "Currently open" : "Currently closed"}
            </span>
            <button
              className={activeShop.current_status === "open" ? "btn btn-coral btn-sm" : "btn btn-pulse btn-sm"}
              onClick={toggleStatus}
            >
              Mark as {activeShop.current_status === "open" ? "closed" : "open"}
            </button>
          </div>

          <h2 className="section-title" style={{ marginTop: 0 }}>Products</h2>
          <div className="card" style={{ marginBottom: 12 }}>
            <form onSubmit={handleAddProduct} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
              <div className="field" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
                <label>Product name</label>
                <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
              </div>
              <div className="field" style={{ width: 110, marginBottom: 0 }}>
                <label>Price (₹)</label>
                <input type="number" step="0.01" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
              </div>
              <div className="field" style={{ width: 150, marginBottom: 0 }}>
                <label>Status</label>
                <select value={productForm.availability_status} onChange={(e) => setProductForm({ ...productForm, availability_status: e.target.value })}>
                  <option value="available">Available</option>
                  <option value="few_left">Few left</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: "auto" }} disabled={submittingProduct}>
                {submittingProduct ? "Adding..." : "Add product"}
              </button>
            </form>
          </div>

          <div className="card">
            {products.length === 0 && <p className="muted">No products yet — add one above, or ask an admin to bulk-upload your catalog.</p>}
            {products.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Price</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.product_id}>
                      <td>{p.name}</td>
                      <td className="price">₹{p.price}</td>
                      <td>
                        <select
                          value={p.availability_status}
                          onChange={(e) => updateProductStatus(p.product_id, e.target.value)}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)" }}
                        >
                          <option value="available">Available</option>
                          <option value="few_left">Few left</option>
                          <option value="out_of_stock">Out of stock</option>
                        </select>
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => deleteProduct(p.product_id, p.name)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <h2 className="section-title">Incoming orders</h2>
          <div className="card">
            {orders.length === 0 && <p className="muted">No orders yet.</p>}
            {orders.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr><th>Product</th><th>Qty</th><th>Customer</th><th>Status</th><th>Next step</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.order_id}>
                      <td>{o.product_name}</td>
                      <td>{o.quantity}</td>
                      <td>{o.customer_name}<br /><span className="muted">{o.delivery_address}</span></td>
                      <td className="mono">{o.status.replace("_", " ")}</td>
                      <td>
                        {ORDER_NEXT_STEPS[o.status]?.length > 0 ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            {ORDER_NEXT_STEPS[o.status].map((next) => (
                              <button
                                key={next}
                                className={next === "cancelled" ? "btn btn-outline btn-sm" : "btn btn-pulse btn-sm"}
                                onClick={() => advanceOrder(o.order_id, next)}
                              >
                                {next.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="muted">Final</span>
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
