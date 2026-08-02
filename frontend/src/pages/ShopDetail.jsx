import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const BADGE_STYLES = {
  available: "bg-pulse-soft text-pulse",
  out_of_stock: "bg-coral-soft text-coral",
  few_left: "bg-amber-soft text-amber",
};

export default function ShopDetail() {
  const { shopId } = useParams();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState({ average_rating: 0, review_count: 0, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [orderingProductId, setOrderingProductId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [locatingAddress, setLocatingAddress] = useState(false);
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

  async function useMyLocationForDelivery() {
    if (!navigator.geolocation) {
      setOrderError("Your browser doesn't support location access — please type your address instead.");
      return;
    }
    setOrderError("");
    setLocatingAddress(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setAddress(data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } catch (err) {
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
          setLocatingAddress(false);
        }
      },
      () => {
        setOrderError("Couldn't access your location. Please type your address instead.");
        setLocatingAddress(false);
      }
    );
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

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-5">
        <p className="text-ink-soft text-[13.5px] mt-7">Loading shop...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-5 pb-[60px]">
      <div className="mt-7 mb-5">
        <h1 className="font-display font-semibold text-ink text-2xl">Shop #{shopId}</h1>
        {reviews.review_count > 0 && (
          <p className="font-mono text-ink-soft text-[13.5px] mt-1">
            ★ {reviews.average_rating} ({reviews.review_count} review{reviews.review_count === 1 ? "" : "s"})
          </p>
        )}
      </div>

      {orderMessage && (
        <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{orderMessage}</div>
      )}
      {orderError && (
        <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px] mb-4">{orderError}</div>
      )}

      <h2 className="font-display font-semibold text-ink text-[15px] mb-3">Products</h2>
      {products.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] text-center py-10 px-5 text-ink-soft">
          No products listed yet.
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6">
        {products.map((product, idx) => (
          <div key={product.product_id}>
            <div
              className={`flex justify-between items-center py-2.5 text-sm ${
                idx !== products.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span>{product.name}</span>
              <span className="flex items-center gap-2.5">
                <span className="font-mono font-medium">₹{product.price}</span>
                <span
                  className={`inline-block font-mono text-[11px] px-[9px] py-[3px] rounded-full uppercase tracking-wide ${
                    BADGE_STYLES[product.availability_status]
                  }`}
                >
                  {product.availability_status.replace("_", " ")}
                </span>
                {user && user.role === "customer" && product.availability_status !== "out_of_stock" && (
                  <button
                    onClick={() =>
                      setOrderingProductId(orderingProductId === product.product_id ? null : product.product_id)
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-pulse text-white font-semibold text-[13px] cursor-pointer hover:opacity-90 transition"
                  >
                    Order
                  </button>
                )}
              </span>
            </div>

            {orderingProductId === product.product_id && (
              <div className="py-3 border-b border-border">
                <div className="inline-block max-w-[100px] mr-3 mb-4">
                  <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
                  />
                </div>

                <div className="mt-2 mb-4">
                  <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Delivery address</label>
                  <div className="flex gap-2">
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Where should this go?"
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={useMyLocationForDelivery}
                      disabled={locatingAddress}
                      className="whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-transparent text-ink font-semibold text-[13px] cursor-pointer hover:border-ink-soft disabled:opacity-55 disabled:cursor-not-allowed transition"
                    >
                      {locatingAddress ? "Locating..." : "Use my location"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handlePlaceOrder(product.product_id)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-pulse text-white font-semibold text-[13px] cursor-pointer hover:opacity-90 transition"
                >
                  Confirm order
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="font-display font-semibold text-ink text-[15px] mt-7 mb-3">Reviews</h2>
      <div className="bg-surface border border-border rounded-2xl shadow-[0_1px_2px_rgba(28,28,30,0.06)] p-6">
        {reviews.reviews.length === 0 && <p className="text-ink-soft text-[13.5px]">No reviews yet.</p>}
        {reviews.reviews.map((r) => (
          <div key={r.review_id} className="py-2.5 border-b border-border">
            <div className="flex justify-between">
              <strong className="text-ink">{r.customer_name}</strong>
              <span className="font-mono">{"★".repeat(r.rating)}</span>
            </div>
            {r.comment && <p className="text-ink-soft text-[13.5px] mt-1">{r.comment}</p>}
          </div>
        ))}

        {user && user.role === "customer" && (
          <form onSubmit={handleSubmitReview} className="mt-4">
            <div className="max-w-[140px] mb-4">
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Your rating</label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Comment (optional)</label>
              <textarea
                rows={2}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none"
              />
            </div>
            {reviewMessage && <p className="text-ink-soft text-[13.5px] mb-3">{reviewMessage}</p>}
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-transparent text-ink font-semibold text-[13px] cursor-pointer hover:border-ink-soft transition"
            >
              Submit review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}