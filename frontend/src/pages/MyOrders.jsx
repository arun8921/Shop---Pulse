import React, { useState, useEffect, useCallback } from "react";
import { PackageSearch, Store, ShoppingBag, Clock, MapPin, XCircle, CheckCircle } from "lucide-react";
import apiClient from "../api/axiosClient";

const STATUS_CONFIG = {
  placed: { label: "Order Placed", color: "bg-slate-soft text-slate", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: Store },
  out_for_delivery: { label: "Out for Delivery", color: "bg-amber-soft text-amber", icon: Navigation },
  delivered: { label: "Delivered", color: "bg-pulse-soft text-pulse", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-coral-soft text-coral", icon: XCircle },
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
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
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
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-ink-soft bg-bg">
        <div className="w-10 h-10 border-4 border-border border-t-pulse rounded-full animate-spin mb-4"></div>
        <p className="font-medium">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-bg min-h-screen pb-16 pt-8">
      <div className="max-w-[1000px] mx-auto px-4 md:px-6">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center shadow-sm border border-border">
            <PackageSearch className="text-pulse" size={24} />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl text-ink">Your Orders</h1>
            <p className="text-ink-soft text-sm">Track and manage your recent purchases.</p>
          </div>
        </div>

        {error && (
          <div className="bg-coral-soft text-coral border border-coral/20 rounded-xl px-4 py-3 text-sm mb-6 flex items-center justify-between">
            {error}
          </div>
        )}

        {orders.length === 0 && (
          <div className="bg-surface border border-border rounded-2xl py-20 text-center shadow-sm">
            <ShoppingBag size={64} className="text-ink-soft/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-ink mb-2">No orders yet</h3>
            <p className="text-ink-soft mb-6">Looks like you haven't made any purchases yet.</p>
            <a href="/" className="btn-primary">Start Shopping</a>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {orders.map((o) => {
            const statusConfig = STATUS_CONFIG[o.status] || STATUS_CONFIG.placed;
            const StatusIcon = statusConfig.icon;
            const orderTotal = (o.price * o.quantity).toFixed(2);
            
            return (
              <div key={o.order_id} className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-md">
                
                {/* Product Image Area */}
                <div className="w-full md:w-[180px] h-32 md:h-auto bg-slate-50 flex items-center justify-center border-b md:border-b-0 md:border-r border-border shrink-0">
                   <ShoppingBag size={48} className="text-slate-300" />
                </div>
                
                {/* Content Area */}
                <div className="p-5 md:p-6 flex-1 flex flex-col">
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                          Order #{o.order_id}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="text-[11px] font-medium text-ink-soft">
                          {new Date(o.order_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-xl text-ink leading-tight mb-1">
                        {o.product_name}
                      </h3>
                      <p className="text-sm font-medium text-ink-soft flex items-center gap-1.5">
                        <Store size={14} /> {o.shop_name}
                      </p>
                    </div>

                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${statusConfig.color} self-start shrink-0`}>
                      <StatusIcon size={14} />
                      {statusConfig.label}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto pt-4 border-t border-border">
                    <div>
                      <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Delivery Address</p>
                      <p className="text-sm text-ink flex items-start gap-1.5">
                        <MapPin size={16} className="text-ink-soft shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{o.delivery_address}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-end justify-between md:justify-end gap-6">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Total Amount</p>
                        <p className="text-xl font-bold text-ink">₹{orderTotal}</p>
                        <p className="text-[11px] text-ink-soft font-medium">Qty: {o.quantity} × ₹{o.price}</p>
                      </div>
                    </div>
                  </div>
                  
                  {["placed", "confirmed"].includes(o.status) && (
                    <div className="mt-5 pt-5 border-t border-border flex justify-end">
                      <button
                        onClick={() => cancelOrder(o.order_id)}
                        className="text-sm font-semibold text-coral hover:text-white hover:bg-coral border border-coral px-4 py-2 rounded-lg transition-colors"
                      >
                        Cancel Order
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Stub Navigation icon since it wasn't imported at top
function Navigation(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>;
}