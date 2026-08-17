import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../api/axiosClient";


const STATUS_TEXT = { open: "text-emerald-600 dark:text-emerald-400", closed: "text-coral" };
const STATUS_DOT = { open: "bg-emerald-500 animate-pulse", closed: "bg-coral" };

export default function AdminPanel() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [uploadShopId, setUploadShopId] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/admin/shops");
      setShops(data.shops || []);
    } catch (err) {
      setError("Could not load shops. Are you logged in as an admin?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  async function verifyShop(shopId, shopName) {
    setError("");
    setMessage("");
    try {
      await apiClient.patch(`/admin/shops/${shopId}/verify`);
      setMessage(`"${shopName}" is now verified.`);
      loadShops();
    } catch (err) {
      setError("Could not verify shop.");
    }
  }
  async function rejectShop(shopId, shopName) {
  const reason = window.prompt(
    `Why do you want to reject "${shopName}"?`
  );

  if (reason === null) {
    return;
  }

  if (!reason.trim()) {
    setError("Rejection reason is required.");
    return;
  }

  setError("");
  setMessage("");

  try {
    const { data } = await apiClient.patch(
      `/admin/shops/${shopId}/reject`,
      {
        reason: reason.trim(),
      }
    );

    setMessage(data.message);
    loadShops();
  } catch (err) {
    setError(
      err.response?.data?.message || "Could not reject shop."
    );
  }
}
async function deleteShop(shopId, shopName) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${shopName}"?\n\nThis will permanently delete the shop and its products, orders, and reviews.`
  );

  if (!confirmed) return;

  setError("");
  setMessage("");

  try {
    const { data } = await apiClient.delete(`/admin/shops/${shopId}`);

    setMessage(data.message);
    loadShops();
  } catch (err) {
    setError(
      err.response?.data?.message || "Could not delete shop."
    );
  }
}
  async function handleUpload(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!uploadShopId || !file) {
      setError("Choose a shop and a CSV file first.");
      return;
    }
    const formData = new FormData();
    formData.append("shop_id", uploadShopId);
    formData.append("file", file);

    setUploading(true);
    try {
      const { data } = await apiClient.post("/admin/products/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(data.message);
      setFile(null);
      setFileInputKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-5">
        <p className="text-ink-soft text-[13.5px] mt-7">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-5 pb-[60px]">
      <h1 className="font-display font-semibold text-ink text-2xl mt-7 mb-5">Admin Panel</h1>

      {message && (
        <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{message}</div>
      )}
      {error && (
        <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{error}</div>
      )}

      <h2 className="font-display font-semibold text-ink text-[15px] mb-3">Bulk upload products via CSV</h2>
      <div className="card mb-6">
        <p className="text-ink-soft text-[13.5px] mb-3">
          CSV columns expected: <span className="font-mono">name, price, availability_status</span>
        </p>
        <form onSubmit={handleUpload} className="flex gap-2.5 flex-wrap items-end">
          <div className="min-w-[160px]">
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Shop</label>
            <select
              value={uploadShopId}
              onChange={(e) => setUploadShopId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
            >
              <option value="">Select a shop</option>
              {shops.map((s) => (
                <option key={s.shop_id} value={s.shop_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">CSV file</label>
            <input
              key={fileInputKey}
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="text-sm text-ink"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>

      <h2 className="font-display font-semibold text-ink text-[15px] mb-3">Shop verification</h2>
      <div className="card">
        {shops.length === 0 && <p className="text-ink-soft text-[13.5px]">No shops registered yet.</p>}
        {shops.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">
                  Shop
                </th>
                <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">
                  Owner
                </th>
                <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">
                  Status
                </th>
                <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">
                  Document
                </th>
                <th className="text-left text-xs uppercase tracking-wide text-ink-soft pb-2 border-b border-border">
                  Verification
                </th>
                <th className="border-b border-border"></th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.shop_id}>
                  <td className="py-2.5 pr-2 border-b border-border">
                    <span className="font-semibold">{s.name}</span>
                    <br />
                    {s.business_category && s.business_sub_category ? (
                      <span className="text-ink-soft text-[12px] block mb-0.5">
                        {s.business_category} &gt; {s.business_sub_category}
                      </span>
                    ) : null}
                    <span className="text-ink-soft text-[13.5px]">{s.address}</span>
                  </td>
                  <td className="py-2.5 pr-2 border-b border-border">
                    {s.owner_name}
                    <br />
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
  {s.verification_status === "approved" && (
    <span className="text-pulse font-medium">
      ✅ Approved
    </span>
  )}

  {s.verification_status === "pending" && (
    <span className="text-yellow-400 font-medium">
      ⏳ Pending
    </span>
  )}

  {s.verification_status === "rejected" && (
    <div>
      <span className="text-coral font-medium">
        ❌ Rejected
      </span>

      {s.verification_reason && (
        <div className="text-ink-soft text-[12px] mt-1 max-w-[180px]">
          Reason: {s.verification_reason}
        </div>
      )}
    </div>
  )}
</td>
                  <td className="py-2.5 border-b border-border">
  <div className="flex items-center gap-2">
    {s.verification_status === "pending" && (
  <>
    <button
      onClick={() => verifyShop(s.shop_id, s.name)}
      className="btn-success px-4 py-2"
    >
      Approve
    </button>

    <button
      onClick={() => rejectShop(s.shop_id, s.name)}
      className="btn-danger px-4 py-2"
    >
      Reject
    </button>
  </>
)}

    <button
      onClick={() => deleteShop(s.shop_id, s.name)}
      className="btn-danger px-4 py-2"
    >
      Delete
    </button>
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}