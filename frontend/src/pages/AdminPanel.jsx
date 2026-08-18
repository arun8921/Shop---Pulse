import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../api/axiosClient";


const STATUS_TEXT = { open: "text-emerald-600 dark:text-emerald-400", closed: "text-coral" };
const STATUS_DOT = { open: "bg-emerald-500 animate-pulse", closed: "bg-coral" };

export default function AdminPanel() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("shops");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [shopsRes, usersRes] = await Promise.all([
        apiClient.get("/admin/shops"),
        apiClient.get("/admin/users"),
      ]);
      setShops(shopsRes.data.shops || []);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      setError("Could not load data. Are you logged in as an admin?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function verifyShop(shopId, shopName) {
    setError("");
    setMessage("");
    try {
      await apiClient.patch(`/admin/shops/${shopId}/verify`);
      setMessage(`"${shopName}" is now verified.`);
      loadData();
    } catch (err) {
      setError("Could not verify shop.");
    }
  }

  async function rejectShop(shopId, shopName) {
    const reason = window.prompt(`Why do you want to reject "${shopName}"?`);
    if (reason === null) return;
    if (!reason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setError("");
    setMessage("");
    try {
      const { data } = await apiClient.patch(`/admin/shops/${shopId}/reject`, { reason: reason.trim() });
      setMessage(data.message);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not reject shop.");
    }
  }

  async function deleteShop(shopId, shopName) {
    const confirmed = window.confirm(`Are you sure you want to delete "${shopName}"?\n\nThis will permanently delete the shop and its products, orders, and reviews.`);
    if (!confirmed) return;
    setError("");
    setMessage("");
    try {
      const { data } = await apiClient.delete(`/admin/shops/${shopId}`);
      setMessage(data.message);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete shop.");
    }
  }

  if (loading && shops.length === 0) {
    return (
      <div className="max-w-[1100px] mx-auto px-5">
        <p className="text-ink-soft text-[13.5px] mt-7">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-5 pb-[60px]">
      <h1 className="font-display font-semibold text-ink text-2xl mt-7 mb-5">Admin Panel</h1>

      {message && <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{message}</div>}
      {error && <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{error}</div>}

      <div className="flex gap-4 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("shops")}
          className={`py-2 px-1 font-semibold text-[14px] border-b-2 transition-colors ${
            activeTab === "shops" ? "border-pulse text-pulse" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Shop Management
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`py-2 px-1 font-semibold text-[14px] border-b-2 transition-colors ${
            activeTab === "users" ? "border-pulse text-pulse" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Registered Users
        </button>
      </div>

      {activeTab === "shops" && (
        <div className="card">
          {shops.length === 0 && <p className="text-ink-soft text-[13.5px]">No shops registered yet.</p>}
          {shops.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm min-w-[800px]">
                <thead>
                  <tr>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Shop</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Owner</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Status</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Document</th>
                    <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Verification</th>
                    <th className="border-b border-border w-[150px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((s) => (
                    <tr key={s.shop_id}>
                      <td className="py-2.5 pr-2 border-b border-border">
                        <span className="font-semibold">{s.name}</span><br />
                        {s.business_category && s.business_sub_category && (
                          <span className="text-ink-soft text-[12px] block mb-0.5">{s.business_category} &gt; {s.business_sub_category}</span>
                        )}
                        <span className="text-ink-soft text-[13.5px]">{s.address}</span>
                      </td>
                      <td className="py-2.5 pr-2 border-b border-border">
                        {s.owner_name}<br />
                        <span className="text-ink-soft text-[13.5px]">{s.owner_email}</span>
                      </td>
                      <td className="py-2.5 pr-2 border-b border-border">
                        <span className={`inline-flex items-center gap-[7px] font-mono text-[12.5px] ${STATUS_TEXT[s.current_status]}`}>
                          <span className={`inline-block w-[9px] h-[9px] rounded-full ${STATUS_DOT[s.current_status]}`}></span>
                          {s.current_status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 border-b border-border">
                        {s.document_url ? (
                          <a
                            href={`${apiClient.defaults.baseURL}/shops/${s.shop_id}/document`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate underline text-[13px] hover:opacity-80"
                            onClick={(e) => {
                              e.preventDefault();
                              apiClient.get(`/shops/${s.shop_id}/document`, { responseType: 'blob' })
                                .then(res => {
                                  const url = URL.createObjectURL(res.data);
                                  window.open(url, '_blank');
                                })
                                .catch(() => setError('Could not load document.'));
                            }}
                          >
                            View document
                          </a>
                        ) : (
                          <span className="text-ink-soft text-[13px]">None</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-2 border-b border-border">
                        {s.verification_status === "approved" && <span className="text-pulse font-medium">✅ Approved</span>}
                        {s.verification_status === "pending" && <span className="text-yellow-400 font-medium">⏳ Pending</span>}
                        {s.verification_status === "rejected" && (
                          <div>
                            <span className="text-coral font-medium">❌ Rejected</span>
                            {s.verification_reason && <div className="text-ink-soft text-[12px] mt-1 max-w-[180px]">Reason: {s.verification_reason}</div>}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 border-b border-border text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {s.verification_status === "pending" && (
                            <>
                              <button onClick={() => verifyShop(s.shop_id, s.name)} className="btn-success px-3 py-1.5 text-[12px]">Approve</button>
                              <button onClick={() => rejectShop(s.shop_id, s.name)} className="btn-danger px-3 py-1.5 text-[12px]">Reject</button>
                            </>
                          )}
                          <button onClick={() => deleteShop(s.shop_id, s.name)} className="btn-danger px-3 py-1.5 text-[12px]">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "users" && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Name</th>
                  <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Email</th>
                  <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Phone</th>
                  <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Role</th>
                  <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">Registered</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="py-3 pr-2 border-b border-border font-medium">{u.name}</td>
                    <td className="py-3 pr-2 border-b border-border">{u.email}</td>
                    <td className="py-3 pr-2 border-b border-border">{u.phone || <span className="text-ink-soft italic">Not provided</span>}</td>
                    <td className="py-3 pr-2 border-b border-border">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-bold ${
                        u.role === "admin" ? "bg-slate-100 text-slate-700" :
                        u.role === "owner" ? "bg-pulse/10 text-pulse" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 border-b border-border text-ink-soft text-[13px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}