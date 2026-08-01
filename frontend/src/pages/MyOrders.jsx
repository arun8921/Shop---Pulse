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

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-5">
        <p className="text-ink-soft text-[13.5px] mt-7">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-5 pb-[60px]">
      <h1 className="font-display font-semibold text-ink text-2xl mt-7 mb-5">Your orders</h1>

      {error && (
        <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">
          {error}
        </div>
      )}

      {orders.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] text-center py-10 px-5 text-ink-soft">
          You haven't placed any orders yet.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <div
            key={o.order_id}
            className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6"
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-display font-semibold text-ink text-base">{o.product_name}</div>
                <div className="text-ink-soft text-[13.5px]">
                  {o.shop_name} · Qty {o.quantity} · ₹{o.price} each
                </div>
              </div>
              <span className="font-mono uppercase text-[12.5px] text-ink whitespace-nowrap">
                {STATUS_LABEL[o.status] || o.status}
              </span>
            </div>

            <p className="text-ink-soft text-[13.5px] mt-2.5 mb-1">
              Delivering to: {o.delivery_address}
            </p>
            <p className="text-ink-soft font-mono text-xs">
              Ordered {new Date(o.order_time).toLocaleString()}
            </p>

            {["placed", "confirmed"].includes(o.status) && (
              <button
                onClick={() => cancelOrder(o.order_id)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-transparent text-ink font-semibold text-[13px] cursor-pointer transition hover:border-ink-soft active:scale-[0.98]"
              >
                Cancel order
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}