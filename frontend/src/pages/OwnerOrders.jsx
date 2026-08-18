import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import apiClient from "../api/axiosClient";

const ORDER_NEXT_STEPS = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export default function OwnerOrders() {
  const { activeShop } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    if (!activeShop) return;
    try {
      const { data } = await apiClient.get(`/orders/shop/${activeShop.shop_id}`);
      setOrders(data.orders || []);
    } catch (err) {
      setError("Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [activeShop]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 25000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  async function advanceOrder(orderId, newStatus) {
    if (newStatus === "cancelled" && !window.confirm("Cancel this order? The customer will see it as cancelled.")) {
      return;
    }
    setError("");
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: newStatus });
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update order status.");
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px]">{error}</div>}

      <div className="card">
        <h2 className="font-display font-semibold text-ink text-[15px] mb-4">Incoming Orders</h2>
        
        {loading && orders.length === 0 ? (
          <p className="text-[13.5px] text-ink-soft">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-ink-soft text-[13.5px]">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Product</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Qty</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Customer</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Status</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider w-[180px]">Next Step</th>
                </tr>
              </thead>
              <tbody className="text-[13.5px] text-ink divide-y divide-border">
                {orders.map((o) => {
                  const availableNext = ORDER_NEXT_STEPS[o.status] || [];
                  return (
                    <tr key={o.order_id} className="hover:bg-slate-soft/30 transition-colors">
                      <td className="py-3 px-3 font-medium">{o.product_name}</td>
                      <td className="py-3 px-3">{o.quantity}</td>
                      <td className="py-3 px-3">
                        <div>{o.customer_name}</div>
                        <div className="text-[11.5px] text-ink-soft">{o.customer_phone}</div>
                        <div className="text-[11.5px] text-ink-soft mt-0.5 truncate max-w-[200px]" title={o.delivery_address}>
                          {o.delivery_address}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11.5px] font-bold ${
                          o.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                          o.status === "cancelled" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {availableNext.length > 0 ? (
                          <div className="flex gap-2">
                            {availableNext.map((nxt) => (
                              <button
                                key={nxt}
                                onClick={() => advanceOrder(o.order_id, nxt)}
                                className={`px-2.5 py-1 rounded text-[12px] font-semibold transition-colors ${
                                  nxt === "cancelled"
                                    ? "text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                                    : "bg-pulse text-white hover:opacity-90"
                                }`}
                              >
                                {nxt.replace(/_/g, " ")}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-ink-soft text-[12px] italic">Final</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
