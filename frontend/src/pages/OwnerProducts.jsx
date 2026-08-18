import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import apiClient from "../api/axiosClient";

export default function OwnerProducts() {
  const { activeShop } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [productForm, setProductForm] = useState({ name: "", price: "", availability_status: "available" });
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState(null);

  const loadProducts = useCallback(async () => {
    if (!activeShop) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get("/products/mine");
      setProducts((data.products || []).filter((p) => p.shop_id === activeShop.shop_id));
    } catch (err) {
      setError("Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [activeShop]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleAddProduct(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!productForm.name.trim() || !productForm.price) {
      setError("Product name and price are required.");
      return;
    }
    setSubmittingProduct(true);
    try {
      await apiClient.post("/products", {
        shop_id: activeShop.shop_id,
        name: productForm.name,
        price: parseFloat(productForm.price),
        availability_status: productForm.availability_status,
      });
      setProductForm({ name: "", price: "", availability_status: "available" });
      setMessage("Product added successfully.");
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add the product.");
    } finally {
      setSubmittingProduct(false);
    }
  }

  async function handleDownloadCsvTemplate() {
    try {
      const response = await apiClient.get("/products/csv-template", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'shop_pulse_product_template.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError("Could not download the CSV template.");
    }
  }

  async function handleCsvUpload(e) {
    e.preventDefault();
    if (!csvFile) {
      setError("Please select a CSV file first.");
      return;
    }
    if (!activeShop) return;

    setError("");
    setMessage("");
    setCsvResult(null);
    setIsUploadingCsv(true);

    const formData = new FormData();
    formData.append("shop_id", activeShop.shop_id);
    formData.append("file", csvFile);

    try {
      const { data } = await apiClient.post("/products/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCsvResult({
        success: true,
        message: data.message,
        total: data.total_rows,
        imported: data.imported,
        failed: data.failed_rows,
        errors: data.errors
      });
      setCsvFile(null);
      loadProducts();
    } catch (err) {
      if (err.response?.data) {
        setCsvResult({
          success: false,
          message: err.response.data.message || "Upload failed",
          total: err.response.data.total_rows || 0,
          imported: err.response.data.valid_rows || 0,
          failed: err.response.data.failed_rows || 0,
          errors: err.response.data.errors || []
        });
      } else {
        setError("Something went wrong during CSV upload.");
      }
    } finally {
      setIsUploadingCsv(false);
    }
  }

  async function updateProductStatus(productId, availability_status) {
    setError("");
    try {
      await apiClient.patch(`/products/${productId}`, { availability_status });
      loadProducts();
    } catch (err) {
      setError("Could not update product status.");
    }
  }

  async function deleteProduct(productId, productName) {
    if (!window.confirm(`Delete "${productName}"? This can't be undone.`)) return;
    setError("");
    try {
      await apiClient.delete(`/products/${productId}`);
      loadProducts();
    } catch (err) {
      setError("Could not delete the product.");
    }
  }

  return (
    <div className="space-y-6">
      {message && <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px]">{message}</div>}
      {error && <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px]">{error}</div>}

      <div className="card">
        <h2 className="font-display font-semibold text-ink text-[15px] mb-3">Add Product</h2>
        <form onSubmit={handleAddProduct} className="flex gap-2.5 flex-wrap items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Product name</label>
            <input
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
            />
          </div>
          <div className="w-[110px]">
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Price (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
            />
          </div>
          <div className="w-[150px]">
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Status</label>
            <select
              value={productForm.availability_status}
              onChange={(e) => setProductForm({ ...productForm, availability_status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
            >
              <option value="available">Available</option>
              <option value="few_left">Few left</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submittingProduct}
            className="btn-primary"
          >
            {submittingProduct ? "Adding..." : "Add product"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-ink text-[15px] mb-2.5">Bulk Upload Products (CSV)</h3>
        <p className="text-[13.5px] text-ink-soft mb-4">
          Import multiple products at once using a CSV file. The template includes all supported fields (name, description, brand, sku, unit, price, mrp, availability_status).
        </p>
        
        <div className="mb-4">
          <button 
            onClick={handleDownloadCsvTemplate}
            type="button" 
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-border bg-bg hover:bg-slate-soft/30 transition-colors rounded-md text-[13px] font-semibold text-ink"
          >
            Download CSV Template
          </button>
        </div>

        <form onSubmit={handleCsvUpload} className="flex gap-3 flex-wrap items-end border-t border-border pt-4">
          <div className="flex-1">
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              className="text-sm text-ink file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pulse/10 file:text-pulse hover:file:bg-pulse/20 cursor-pointer"
            />
          </div>
          <button 
            type="submit"
            disabled={isUploadingCsv || !csvFile}
            className="btn-primary disabled:opacity-50"
          >
            {isUploadingCsv ? "Uploading..." : "Import CSV"}
          </button>
        </form>

        {csvResult && (
          <div className={`mt-5 p-4 rounded-xl border ${csvResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <h4 className={`font-semibold text-[14px] mb-2 ${csvResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
              {csvResult.message}
            </h4>
            <ul className={`text-[13px] space-y-1 mb-3 ${csvResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
              <li>Total rows processed: {csvResult.total}</li>
              <li>Successfully imported: {csvResult.imported}</li>
              {csvResult.failed > 0 && <li>Failed to import: {csvResult.failed}</li>}
            </ul>
            
            {csvResult.errors && csvResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-[13px] font-semibold text-red-800 mb-1">Errors:</p>
                <ul className="text-[12.5px] text-red-700 list-disc pl-4 space-y-1 max-h-[150px] overflow-y-auto">
                  {csvResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <p className="text-[13.5px] text-ink-soft">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-ink-soft text-[13.5px]">No products added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Name</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Price</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider">Status</th>
                  <th className="py-2.5 px-3 text-[11px] font-bold text-ink-soft uppercase tracking-wider w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="text-[13.5px] text-ink divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-soft/30 transition-colors">
                    <td className="py-3 px-3 font-medium">{p.name}</td>
                    <td className="py-3 px-3">₹{parseFloat(p.price).toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <select
                        value={p.availability_status}
                        onChange={(e) => updateProductStatus(p.product_id, e.target.value)}
                        className="px-2.5 py-1 text-[13px] border border-border rounded-md bg-bg text-ink"
                      >
                        <option value="available">Available</option>
                        <option value="few_left">Few left</option>
                        <option value="out_of_stock">Out of stock</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => deleteProduct(p.product_id, p.name)}
                        className="text-coral hover:text-red-700 font-semibold text-[13px]"
                      >
                        Delete
                      </button>
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
