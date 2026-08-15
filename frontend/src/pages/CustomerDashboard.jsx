import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, MapPinned, PackageCheck, PencilLine, ShoppingBag, XCircle } from "lucide-react";
import apiClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const STATUS_LABELS = {
  placed: "Order placed",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_STATUS_STYLES = {
  placed: "bg-slate-soft text-slate",
  confirmed: "bg-slate-soft text-slate",
  out_for_delivery: "bg-amber-soft text-amber",
  delivered: "bg-pulse-soft text-pulse",
  cancelled: "bg-coral-soft text-coral",
};

const METRIC_TONE_STYLES = {
  blue: "bg-slate-soft text-slate",
  green: "bg-pulse-soft text-pulse",
  orange: "bg-amber-soft text-amber",
  violet: "bg-indigo-50 text-indigo-600",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function CustomerDashboard() {
  const { user, updateProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const loadOrders = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await apiClient.get("/orders/mine");
      setOrders(data.orders || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't load your order activity. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setProfileForm({ name: user?.name || "", phone: user?.phone || "" });
  }, [user]);

  const summary = useMemo(() => {
    const active = orders.filter((order) => ["placed", "confirmed", "out_for_delivery"].includes(order.status));
    const delivered = orders.filter((order) => order.status === "delivered");
    const cancelled = orders.filter((order) => order.status === "cancelled");
    const totalSpent = delivered.reduce(
      (sum, order) => sum + Number(order.unit_price || order.price || 0) * Number(order.quantity || 0),
      0
    );
    return { active, delivered, cancelled, totalSpent };
  }, [orders]);

  async function handleProfileSave(event) {
    event.preventDefault();
    setProfileMessage("");
    setSavingProfile(true);
    try {
      await updateProfile({ name: profileForm.name.trim(), phone: profileForm.phone.trim() });
      setProfileMessage("Profile saved.");
      setEditingProfile(false);
    } catch (err) {
      setProfileMessage(err.response?.data?.message || "Could not update your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  const metricCards = [
    { label: "Active orders", value: summary.active.length, detail: "Being prepared or delivered", icon: Clock3, tone: "blue" },
    { label: "Delivered", value: summary.delivered.length, detail: "Completed orders", icon: PackageCheck, tone: "green" },
    { label: "Cancelled", value: summary.cancelled.length, detail: "Order history", icon: XCircle, tone: "orange" },
    { label: "Delivered value", value: formatCurrency(summary.totalSpent), detail: "Across completed orders", icon: CheckCircle2, tone: "violet" },
  ];

  return (
    <main className="max-w-[1100px] mx-auto px-5 pb-[60px]">
      <section className="card flex justify-between items-start flex-wrap gap-5 mt-7 mb-6">
        <div>
          <span className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1.5">
            Customer workspace
          </span>
          <h1 className="font-display font-semibold text-ink text-2xl">
            Good to see you, {user?.name?.split(" ")[0] || "there"}.
          </h1>
          <p className="text-ink-soft text-[13.5px] mt-1.5">
            Check your latest orders, update your profile, or find a great local shop nearby.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Link
            to="/discover"
            className="inline-flex items-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
          >
            <MapPinned size={17} /> Explore nearby shops
          </Link>
          <Link
            to="/my-orders"
            className="inline-flex items-center gap-1.5 px-[18px] py-2.5 rounded-md border border-border bg-transparent text-ink font-semibold text-sm hover:border-ink-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
          >
            <ShoppingBag size={17} /> All orders
          </Link>
        </div>
      </section>

      {error && (
        <div role="alert" className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-6">
          {error}
        </div>
      )}

      <section aria-label="Order summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metricCards.map(({ label, value, detail, icon: Icon, tone }) => (
          <article
            key={label}
            className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-5 flex items-start gap-3"
          >
            <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${METRIC_TONE_STYLES[tone]}`}>
              <Icon size={20} />
            </span>
            <div>
              <p className="text-ink-soft text-[13px]">{label}</p>
              <strong className="font-display font-semibold text-ink text-xl block">{loading ? "—" : value}</strong>
              <small className="text-ink-soft text-xs block mt-0.5">{detail}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <article className="card">
          <div className="flex justify-between items-start gap-3 mb-4">
            <div>
              <span className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1.5">
                Recent activity
              </span>
              <h2 className="font-display font-semibold text-ink text-base">Your latest orders</h2>
            </div>
            <button
              onClick={() => loadOrders(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-transparent text-ink-soft font-semibold text-[13px] cursor-pointer hover:text-ink hover:bg-bg disabled:opacity-55 disabled:cursor-not-allowed transition"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {loading && <p className="text-ink-soft text-[13.5px] text-center py-6">Loading your orders…</p>}

          {!loading && orders.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 text-center py-8">
              <ShoppingBag size={28} className="text-ink-soft" />
              <p className="text-ink-soft text-[13.5px]">You have no orders yet. Discover a local shop to get started.</p>
              <Link
                to="/discover"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-pulse text-white font-semibold text-[13px] hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
              >
                Find shops
              </Link>
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="divide-y divide-border">
              {orders.slice(0, 4).map((order) => (
                <div key={order.order_id} className="flex items-center gap-3 py-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${ORDER_STATUS_STYLES[order.status]}`}>
                    <PackageCheck size={17} />
                  </span>
                  <div className="flex-1 flex flex-col min-w-0">
                    <strong className="text-ink text-sm font-medium truncate">{order.product_name}</strong>
                    <span className="text-ink-soft text-[13px] truncate">
                      {order.shop_name} · Qty {order.quantity}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className={`inline-block font-mono text-[11px] px-[9px] py-[3px] rounded-full uppercase tracking-wide whitespace-nowrap ${ORDER_STATUS_STYLES[order.status]}`}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <small className="text-ink-soft text-xs">
                      {new Date(order.order_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && orders.length > 0 && (
            <Link to="/my-orders" className="inline-block mt-4 text-slate text-[13.5px] font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-sm">
              View full order history →
            </Link>
          )}
        </article>

        <article className="card">
          <div className="flex justify-between items-start gap-3 mb-4">
            <div>
              <span className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1.5">
                Your account
              </span>
              <h2 className="font-display font-semibold text-ink text-base">Profile details</h2>
            </div>
            {!editingProfile && (
              <button
                onClick={() => {
                  setProfileMessage("");
                  setEditingProfile(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-transparent text-ink-soft font-semibold text-[13px] cursor-pointer hover:text-ink hover:bg-bg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
              >
                <PencilLine size={15} /> Edit
              </button>
            )}
          </div>

          {!editingProfile ? (
            <dl className="divide-y divide-border">
              <div className="flex justify-between py-2">
                <dt className="text-ink-soft text-[13.5px]">Name</dt>
                <dd className="text-ink text-[13.5px] font-medium">{user?.name || "—"}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-ink-soft text-[13.5px]">Email</dt>
                <dd className="text-ink text-[13.5px] font-medium">{user?.email || "—"}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-ink-soft text-[13.5px]">Phone</dt>
                <dd className="text-ink text-[13.5px] font-medium">{user?.phone || "Add a phone number"}</dd>
              </div>
            </dl>
          ) : (
            <form onSubmit={handleProfileSave}>
              <div className="mb-4">
                <label htmlFor="profile-name" className="block text-[13px] font-medium text-ink-soft mb-1.5">
                  Name
                </label>
                <input
                  id="profile-name"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  maxLength={100}
                  className="input-field"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="profile-phone" className="block text-[13px] font-medium text-ink-soft mb-1.5">
                  Phone number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                  maxLength={20}
                  placeholder="Optional"
                  className="input-field"
                />
              </div>
              {profileMessage && (
                <p className={`text-[13.5px] mb-3 ${profileMessage === "Profile saved." ? "text-pulse" : "text-coral"}`}>
                  {profileMessage}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-slate text-white font-semibold text-[13px] cursor-pointer hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed transition"
                >
                  {savingProfile ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileForm({ name: user?.name || "", phone: user?.phone || "" });
                    setProfileMessage("");
                    setEditingProfile(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-transparent text-ink font-semibold text-[13px] cursor-pointer hover:border-ink-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {!editingProfile && profileMessage && <p className="text-pulse text-[13.5px] mt-3">{profileMessage}</p>}
        </article>
      </section>
    </main>
  );
}