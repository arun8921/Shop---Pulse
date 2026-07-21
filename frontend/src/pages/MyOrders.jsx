import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../api/axiosClient";

const STATUS_LABEL = {
  placed: "Placed",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // silent=true is used for background polling refreshes, so the list
  // doesn't flash back to a loading state every 25 seconds.
  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await apiClient.get("/orders/mine");
      setOrders(data.orders || []);
      setError("");
    } catch (err) {
      if (!silent) setError("Could not load your orders.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(true), 25000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  async function cancelOrder(orderId) {
    if (!window.confirm("Cancel this order?")) return;
    setError("");
    try {
      await apiClient.patch(`/orders/${orderId}/cancel`);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Could not cancel this order.");
    }
  }

  if (loading) return <div className="container"><p className="muted" style={{ marginTop: 28 }}>Loading your orders...</p></div>;

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <h1 style={{ marginTop: 28, marginBottom: 20 }}>Your orders</h1>

      {error && <div className="error-banner">{error}</div>}

      {orders.length === 0 && (
        <div className="card empty-state">You haven't placed any orders yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map((o) => (
          <div key={o.order_id} className="card">
            <div className="shop-card-top">
              <div>
                <div className="shop-name">{o.product_name}</div>
                <div className="muted">{o.shop_name} · Qty {o.quantity} · ₹{o.price} each</div>
              </div>
              <span className="mono" style={{ textTransform: "uppercase", fontSize: 12.5 }}>
                {STATUS_LABEL[o.status] || o.status}
              </span>
            </div>

            <p className="muted" style={{ marginTop: 10, marginBottom: 4 }}>
              Delivering to: {o.delivery_address}
            </p>
            <p className="muted mono" style={{ fontSize: 12 }}>
              Ordered {new Date(o.order_time).toLocaleString()}
            </p>

            {["placed", "confirmed"].includes(o.status) && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => cancelOrder(o.order_id)}>
                Cancel order
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
