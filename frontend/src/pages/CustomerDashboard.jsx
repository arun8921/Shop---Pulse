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
    <main className="container dashboard-page customer-dashboard">
      <section className="dashboard-hero customer-hero">
        <div>
          <span className="eyebrow">Customer workspace</span>
          <h1>Good to see you, {user?.name?.split(" ")[0] || "there"}.</h1>
          <p>Check your latest orders, update your profile, or find a great local shop nearby.</p>
        </div>
        <div className="hero-actions">
          <Link to="/discover" className="btn btn-primary"><MapPinned size={17} /> Explore nearby shops</Link>
          <Link to="/my-orders" className="btn btn-outline"><ShoppingBag size={17} /> All orders</Link>
        </div>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <section className="metric-grid" aria-label="Order summary">
        {metricCards.map(({ label, value, detail, icon: Icon, tone }) => (
          <article className={`metric-card metric-${tone}`} key={label}>
            <span className="metric-icon"><Icon size={20} /></span>
            <div>
              <p>{label}</p>
              <strong>{loading ? "—" : value}</strong>
              <small>{detail}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-two-column">
        <article className="card dashboard-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Recent activity</span>
              <h2>Your latest orders</h2>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => loadOrders(true)} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {loading && <p className="muted panel-empty">Loading your orders…</p>}
          {!loading && orders.length === 0 && (
            <div className="panel-empty empty-with-action">
              <ShoppingBag size={28} />
              <p>You have no orders yet. Discover a local shop to get started.</p>
              <Link to="/discover" className="btn btn-pulse btn-sm">Find shops</Link>
            </div>
          )}
          {!loading && orders.slice(0, 4).map((order) => (
            <div className="activity-row" key={order.order_id}>
              <span className={`activity-status ${order.status}`}><PackageCheck size={17} /></span>
              <div className="activity-main">
                <strong>{order.product_name}</strong>
                <span>{order.shop_name} · Qty {order.quantity}</span>
              </div>
              <div className="activity-meta">
                <span className={`order-status ${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span>
                <small>{new Date(order.order_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small>
              </div>
            </div>
          ))}
          {!loading && orders.length > 0 && <Link className="panel-link" to="/my-orders">View full order history →</Link>}
        </article>

        <article className="card dashboard-panel profile-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Your account</span>
              <h2>Profile details</h2>
            </div>
            {!editingProfile && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setProfileMessage(""); setEditingProfile(true); }}>
                <PencilLine size={15} /> Edit
              </button>
            )}
          </div>

          {!editingProfile ? (
            <dl className="profile-list">
              <div><dt>Name</dt><dd>{user?.name || "—"}</dd></div>
              <div><dt>Email</dt><dd>{user?.email || "—"}</dd></div>
              <div><dt>Phone</dt><dd>{user?.phone || "Add a phone number"}</dd></div>
            </dl>
          ) : (
            <form onSubmit={handleProfileSave}>
              <div className="field">
                <label htmlFor="profile-name">Name</label>
                <input id="profile-name" value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} required maxLength={100} />
              </div>
              <div className="field">
                <label htmlFor="profile-phone">Phone number</label>
                <input id="profile-phone" type="tel" value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} maxLength={20} placeholder="Optional" />
              </div>
              {profileMessage && <p className={profileMessage === "Profile saved." ? "form-success" : "form-error"}>{profileMessage}</p>}
              <div className="form-actions">
                <button className="btn btn-primary btn-sm" type="submit" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save changes"}</button>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => { setProfileForm({ name: user?.name || "", phone: user?.phone || "" }); setProfileMessage(""); setEditingProfile(false); }}>Cancel</button>
              </div>
            </form>
          )}
          {!editingProfile && profileMessage && <p className="form-success">{profileMessage}</p>}
        </article>
      </section>
    </main>
  );
}
