import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import apiClient from "../api/axiosClient";

export default function OwnerDashboard() {
  const { activeShop } = useOutletContext();
  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!activeShop) return;
    setLoading(true);
    try {
      const [summaryRes, ordersRes] = await Promise.all([
        apiClient.get("/shops/mine/summary"),
        apiClient.get(`/orders/shop/${activeShop.shop_id}`),
      ]);
      setSummary(summaryRes.data.summary);
      setRecentOrders((ordersRes.data.orders || []).slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeShop]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 25000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !summary) {
    return <div className="p-5 text-ink-soft">Loading overview...</div>;
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <h3 className="text-ink-soft text-[13px] font-medium mb-1">Total Shops</h3>
            <p className="text-2xl font-bold text-ink">{summary.shop_count}</p>
          </div>
          <div className="card">
            <h3 className="text-ink-soft text-[13px] font-medium mb-1">Open Shops</h3>
            <p className="text-2xl font-bold text-emerald-600">{summary.open_shop_count}</p>
          </div>
          <div className="card">
            <h3 className="text-ink-soft text-[13px] font-medium mb-1">Active Orders</h3>
            <p className="text-2xl font-bold text-pulse">{summary.active_order_count}</p>
          </div>
          <div className="card">
            <h3 className="text-ink-soft text-[13px] font-medium mb-1">Products needing attention</h3>
            <p className="text-2xl font-bold text-coral">{summary.attention_product_count}</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-semibold text-ink text-[15px]">Recent Orders (This Shop)</h2>
          <Link to="/owner/orders" className="text-pulse hover:text-pulse-soft text-[13px] font-medium">View all</Link>
        </div>
        
        {recentOrders.length === 0 ? (
          <p className="text-ink-soft text-[13.5px]">No recent orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Product</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Qty</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Customer</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="text-[13.5px] text-ink divide-y divide-border">
                {recentOrders.map((o) => (
                  <tr key={o.order_id} className="hover:bg-slate-soft/30 transition-colors">
                    <td className="py-3 px-3 font-medium">{o.product_name}</td>
                    <td className="py-3 px-3">{o.quantity}</td>
                    <td className="py-3 px-3">
                      <div>{o.customer_name}</div>
                      <div className="text-[11.5px] text-ink-soft">{o.customer_phone}</div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}