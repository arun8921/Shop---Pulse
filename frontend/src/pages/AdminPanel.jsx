import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../api/axiosClient";

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

  if (loading) return <div className="container"><p className="muted" style={{ marginTop: 28 }}>Loading admin panel...</p></div>;

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <h1 style={{ marginTop: 28, marginBottom: 20 }}>Admin Panel</h1>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      <h2 className="section-title" style={{ marginTop: 0 }}>Bulk upload products via CSV</h2>
      <div className="card" style={{ marginBottom: 24 }}>
        <p className="muted" style={{ marginBottom: 12 }}>
          CSV columns expected: <span className="mono">name, price, availability_status</span>
        </p>
        <form onSubmit={handleUpload} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div className="field" style={{ minWidth: 160, marginBottom: 0 }}>
            <label>Shop</label>
            <select value={uploadShopId} onChange={(e) => setUploadShopId(e.target.value)}>
              <option value="">Select a shop</option>
              {shops.map((s) => (
                <option key={s.shop_id} value={s.shop_id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>CSV file</label>
            <input key={fileInputKey} type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: "auto" }} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>

      <h2 className="section-title">Shop verification</h2>
      <div className="card">
        {shops.length === 0 && <p className="muted">No shops registered yet.</p>}
        {shops.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Shop</th><th>Owner</th><th>Status</th><th>Verified</th><th></th></tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.shop_id}>
                  <td>{s.name}<br /><span className="muted">{s.address}</span></td>
                  <td>{s.owner_name}<br /><span className="muted">{s.owner_email}</span></td>
                  <td>
                    <span className={`status-row ${s.current_status}`}>
                      <span className={`status-dot ${s.current_status}`}></span>
                      {s.current_status}
                    </span>
                  </td>
                  <td>{s.is_verified ? "✅ Verified" : "Pending"}</td>
                  <td>
                    {!s.is_verified && (
                      <button className="btn btn-pulse btn-sm" onClick={() => verifyShop(s.shop_id, s.name)}>Verify</button>
                    )}
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
