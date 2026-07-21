import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

export default function ShopDetail() {
  const { shopId } = useParams();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState({ average_rating: 0, review_count: 0, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [orderingProductId, setOrderingProductId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, reviewsRes] = await Promise.all([
        apiClient.get(`/products/shop/${shopId}`),
        apiClient.get(`/reviews/shop/${shopId}`),
      ]);
      setProducts(productsRes.data.products || []);
      setReviews(reviewsRes.data);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handlePlaceOrder(productId) {
    setOrderError("");
    setOrderMessage("");
    if (!address.trim()) {
      setOrderError("Please enter a delivery address.");
      return;
    }
    try {
      await apiClient.post("/orders", {
        shop_id: Number(shopId),
        product_id: productId,
        quantity,
        delivery_address: address,
      });
      setOrderMessage("Order placed! Track it from your order history.");
      setOrderingProductId(null);
      setQuantity(1);
      setAddress("");
    } catch (err) {
      setOrderError(err.response?.data?.message || "Could not place the order.");
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    setReviewMessage("");
    try {
      await apiClient.post("/reviews", { shop_id: Number(shopId), rating: reviewRating, comment: reviewComment });
      setReviewMessage("Thanks for your review!");
      setReviewComment("");
      loadData();
    } catch (err) {
      setReviewMessage(err.response?.data?.message || "Could not submit review.");
    }
  }

  if (loading) return <div className="container"><p className="muted" style={{ marginTop: 28 }}>Loading shop...</p></div>;

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div style={{ marginTop: 28, marginBottom: 20 }}>
        <h1>Shop #{shopId}</h1>
        {reviews.review_count > 0 && (
          <p className="mono muted">
            ★ {reviews.average_rating} ({reviews.review_count} review{reviews.review_count === 1 ? "" : "s"})
          </p>
        )}
      </div>

      {orderMessage && <div className="success-banner">{orderMessage}</div>}
      {orderError && <div className="error-banner">{orderError}</div>}

      <h2 className="section-title" style={{ marginTop: 0 }}>Products</h2>
      {products.length === 0 && <div className="card empty-state">No products listed yet.</div>}

      <div className="card">
        {products.map((product) => (
          <div key={product.product_id}>
            <div className="product-row">
              <span>{product.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="price">₹{product.price}</span>
                <span className={`badge ${product.availability_status}`}>
                  {product.availability_status.replace("_", " ")}
                </span>
                {user && user.role === "customer" && product.availability_status !== "out_of_stock" && (
                  <button
                    className="btn btn-pulse btn-sm"
                    onClick={() => setOrderingProductId(orderingProductId === product.product_id ? null : product.product_id)}
                  >
                    Order
                  </button>
                )}
              </span>
            </div>

            {orderingProductId === product.product_id && (
              <div style={{ padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
                <div className="field" style={{ maxWidth: 100, display: "inline-block", marginRight: 12 }}>
                  <label>Quantity</label>
                  <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} />
                </div>
                <div className="field" style={{ marginTop: 8 }}>
                  <label>Delivery address</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Where should this go?" />
                </div>
                <button className="btn btn-pulse btn-sm" onClick={() => handlePlaceOrder(product.product_id)}>
                  Confirm order
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="section-title">Reviews</h2>
      <div className="card">
        {reviews.reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        {reviews.reviews.map((r) => (
          <div key={r.review_id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{r.customer_name}</strong>
              <span className="mono">{"★".repeat(r.rating)}</span>
            </div>
            {r.comment && <p className="muted" style={{ marginTop: 4 }}>{r.comment}</p>}
          </div>
        ))}

        {user && user.role === "customer" && (
          <form onSubmit={handleSubmitReview} style={{ marginTop: 16 }}>
            <div className="field" style={{ maxWidth: 140 }}>
              <label>Your rating</label>
              <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{"★".repeat(n)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Comment (optional)</label>
              <textarea rows={2} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            </div>
            {reviewMessage && <p className="muted">{reviewMessage}</p>}
            <button className="btn btn-outline btn-sm" type="submit">Submit review</button>
          </form>
        )}
      </div>
    </div>
  );
}
