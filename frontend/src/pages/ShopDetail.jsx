import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Star, ShoppingBag, X, Store, Navigation, ShoppingCart } from "lucide-react";
import apiClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function ShopDetail() {
  const { shopId } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();

  function formatTime(timeStr) {
    if (!timeStr) return "their next opening time";
    const [hour, min] = timeStr.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12; 
    return `${h}:${min} ${ampm}`;
  }

  const [products, setProducts] = useState([]);
  const [shop, setShop] = useState(null);
  const [reviews, setReviews] = useState({ average_rating: 0, review_count: 0, reviews: [] });
  const [loading, setLoading] = useState(true);
  
  // Product Modal / Order State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Review State
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
      setShop(productsRes.data.shop || null);
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

  // Handle opening modal
  const openProductModal = (product) => {
    if (shop?.current_status !== "open" || product.availability_status === "out_of_stock") return;
    setSelectedProduct(product);
    setQuantity(1);
    setOrderMessage("");
    setOrderError("");
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
  };

  async function handlePlaceOrder() {
    setOrderError("");
    setOrderMessage("");
    if (!selectedProduct) return;

    if (shop?.current_status !== "open") {
      setOrderError("This shop is currently closed.");
      return;
    }
    if (!address.trim()) {
      setOrderError("Please enter a delivery address.");
      return;
    }
    
    setIsPlacingOrder(true);
    try {
      await apiClient.post("/orders", {
        shop_id: Number(shopId),
        product_id: selectedProduct.product_id,
        quantity,
        delivery_address: address,
      });
      setOrderMessage("Order placed! Track it from your order history.");
      setTimeout(() => {
        closeProductModal();
        setOrderMessage("");
      }, 3000);
    } catch (err) {
      setOrderError(err.response?.data?.message || "Could not place the order.");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  async function useMyLocationForDelivery() {
    if (!navigator.geolocation) {
      setOrderError("Your browser doesn't support location access.");
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
        setOrderError("Couldn't access your location.");
        setLocatingAddress(false);
      }
      
    );
  }

  function handleAddToCart() {
    if (!user) {
      setOrderError("Please login to add to cart.");
      return;
    }
    addToCart(selectedProduct, shop, quantity);
    setOrderMessage("Added to Cart!");
    setTimeout(() => {
      setSelectedProduct(null);
      setOrderMessage("");
    }, 1500);
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
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-ink-soft bg-bg">
        <div className="w-10 h-10 border-4 border-border border-t-pulse rounded-full animate-spin mb-4"></div>
        <p className="font-medium">Loading store profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-bg min-h-screen pb-16">
      
      {/* SHOP HERO */}
      <div className="bg-surface border-b border-border shadow-sm mb-8 pt-8 pb-10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-50 rounded-full border-4 border-white shadow-lg flex items-center justify-center shrink-0">
                <Store size={48} className="text-slate-300" />
              </div>
              <div>
                <h1 className="font-display font-bold text-3xl md:text-4xl text-ink mb-2">
                  {shop?.name || `Shop #${shopId}`}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                  {shop && (
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full uppercase tracking-wider text-[11px] font-bold border ${
                      shop.current_status === "open" ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.25)]" : "bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-rose-500/30 text-rose-700 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
                    }`}>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${shop.current_status === 'open' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${shop.current_status === 'open' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'}`}></span>
                      </span>
                      {shop.current_status}
                    </span>
                  )}
                  {reviews.review_count > 0 && (
                    <span className="flex items-center gap-1 text-ink-soft bg-slate-50 px-3 py-1 rounded-full">
                      <Star size={14} className="fill-amber text-amber" /> 
                      <span className="font-bold text-ink">{Number(reviews.average_rating).toFixed(1)}</span>
                      <span>({reviews.review_count})</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>

      {shop?.current_status === "closed" && (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 mb-8 -mt-2">
          <div className="bg-coral-soft border border-coral/20 rounded-2xl p-5 flex items-start sm:items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center shrink-0">
              <Store size={20} className="text-coral" />
            </div>
            <div>
              <h3 className="text-coral font-bold text-[15px] mb-0.5">This shop is currently closed.</h3>
              <p className="text-coral/90 text-sm font-medium leading-relaxed">
                You can browse products, but ordering is disabled until the shop opens again at {formatTime(shop.default_open_time)}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1280px] mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* MAIN PRODUCTS AREA */}
        <div className="lg:col-span-2">
          <h2 className="font-display font-bold text-2xl text-ink mb-6">All Products</h2>
          
          {products.length === 0 && (
            <div className="bg-surface border border-border rounded-2xl py-16 text-center shadow-sm">
              <ShoppingBag size={48} className="text-ink-soft/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-ink mb-2">No products found</h3>
              <p className="text-ink-soft">This store hasn't listed any products yet.</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {products.map((product) => {
              const isOut = product.availability_status === 'out_of_stock';
              const discountPercent = product.mrp && product.mrp > product.price 
                ? Math.round(((product.mrp - product.price) / product.mrp) * 100) 
                : 0;

              return (
                <div 
                  key={product.product_id} 
                  className={`product-card ${isOut || shop?.current_status !== 'open' ? 'opacity-70 grayscale-[0.2]' : 'cursor-pointer'}`}
                  onClick={() => openProductModal(product)}
                >
                  <div className="aspect-square bg-slate-50 relative p-4 flex items-center justify-center">
                    <ShoppingBag size={40} className="text-slate-200" />
                    {discountPercent > 0 && (
                      <div className="absolute top-2 left-2 bg-coral text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        {discountPercent}% OFF
                      </div>
                    )}
                    {isOut && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-ink text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 md:p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider truncate">
                        {product.brand || 'Unbranded'}
                      </span>
                      {!isOut && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${product.availability_status === 'few_left' ? 'bg-amber-soft text-amber' : 'bg-pulse-soft text-pulse'}`}>
                          {product.availability_status === 'few_left' ? 'Few Left' : 'In Stock'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-ink text-[13px] md:text-[14px] leading-snug mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <div className="mt-auto pt-2 border-t border-border flex items-end justify-between">
                      <div>
                        {product.unit && <div className="text-[10px] text-ink-soft">{product.unit}</div>}
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[15px] md:text-[16px] text-ink">₹{product.price}</span>
                          {product.mrp && product.mrp > product.price && (
                            <span className="text-[11px] text-ink-soft line-through">₹{product.mrp}</span>
                          )}
                        </div>
                      </div>
                      
                      {user && user.role === "customer" && !isOut && shop?.current_status === "open" && (
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-pulse text-white flex items-center justify-center shadow-md shadow-pulse/20 shrink-0">
                          <span className="text-lg leading-none mb-0.5">+</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SIDEBAR: REVIEWS */}
        <div className="lg:col-span-1">
          <div className="sticky top-[100px]">
            <h2 className="font-display font-bold text-xl text-ink mb-4">Customer Reviews</h2>
            <div className="card shadow-sm mb-6 p-5">
              {reviews.reviews.length === 0 && (
                <div className="text-center py-6 text-ink-soft">
                  <Star size={32} className="mx-auto mb-2 text-border" />
                  <p className="text-sm">No reviews yet.</p>
                </div>
              )}
              
              <div className="flex flex-col gap-4">
                {reviews.reviews.map((r) => (
                  <div key={r.review_id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-sm text-ink">{r.customer_name}</strong>
                      <div className="flex text-amber">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} className={i < r.rating ? "fill-amber" : "text-border fill-transparent"} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-ink-soft text-[13px] leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>

            {user && user.role === "customer" && (
              <div className="card shadow-sm p-5 bg-pulse-soft/10 border-pulse/20">
                <h3 className="font-semibold text-sm mb-3">Leave a review</h3>
                <form onSubmit={handleSubmitReview}>
                  <div className="mb-3">
                    <label className="block text-[12px] font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">Rating</label>
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:border-pulse focus:ring-1 focus:ring-pulse outline-none"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{n} Stars</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[12px] font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">Comment (Optional)</label>
                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:border-pulse focus:ring-1 focus:ring-pulse outline-none resize-none"
                      placeholder="Share your experience..."
                    />
                  </div>
                  {reviewMessage && <p className="text-pulse font-medium text-xs mb-3">{reviewMessage}</p>}
                  <button type="submit" className="w-full btn-primary text-sm py-2">
                    Submit Review
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRODUCT DETAILS & ORDER MODAL (Two-Column on Desktop) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm transition-opacity"
            onClick={closeProductModal}
          ></div>
          
          {/* Modal Content */}
          <div className="bg-surface w-full max-w-4xl rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={closeProductModal}
              className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={18} className="text-ink" />
            </button>

            <div className="flex flex-col md:flex-row h-full overflow-y-auto">
              
              {/* LEFT COLUMN: Image */}
              <div className="w-full md:w-1/2 bg-slate-50 p-8 flex items-center justify-center min-h-[300px] border-b md:border-b-0 md:border-r border-border relative">
                <ShoppingBag size={120} className="text-slate-200" />
                {selectedProduct.availability_status === 'few_left' && (
                  <div className="absolute top-6 left-6 bg-amber-soft text-amber text-xs font-bold px-3 py-1 rounded-md">
                    Only a few left!
                  </div>
                )}
              </div>
              
              {/* RIGHT COLUMN: Details & Order Form */}
              <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
                <div className="mb-1 text-xs font-bold text-ink-soft uppercase tracking-wider">
                  {selectedProduct.brand || 'Unbranded'}
                </div>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-ink mb-2 leading-tight">
                  {selectedProduct.name}
                </h2>
                
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-bold text-3xl text-ink">₹{selectedProduct.price}</span>
                  {selectedProduct.mrp && selectedProduct.mrp > selectedProduct.price && (
                    <span className="text-lg text-ink-soft line-through">₹{selectedProduct.mrp}</span>
                  )}
                  {selectedProduct.unit && <span className="text-sm font-medium text-ink-soft ml-2">/ {selectedProduct.unit}</span>}
                </div>
                
                {selectedProduct.description && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">Description</h4>
                    <p className="text-sm text-ink leading-relaxed">{selectedProduct.description}</p>
                  </div>
                )}

                <div className="mt-auto">
                  {orderMessage ? (
                    <div className="bg-pulse-soft border border-pulse/20 text-pulse rounded-xl p-4 text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                        <ShoppingBag size={24} className="text-pulse" />
                      </div>
                      <p className="font-bold">{orderMessage}</p>
                    </div>
                  ) : (
                    <div className="bg-bg rounded-xl p-5 border border-border">
                      <h4 className="font-semibold text-ink mb-4">Express Delivery</h4>
                      
                      {orderError && (
                        <div className="bg-coral-soft text-coral text-xs font-medium px-3 py-2 rounded-md mb-4">
                          {orderError}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-ink-soft mb-1.5 uppercase">Quantity</label>
                          <div className="flex items-center bg-surface border border-border rounded-lg overflow-hidden">
                            <button 
                              type="button"
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-ink font-bold transition-colors"
                            >-</button>
                            <input
                              type="number"
                              min={1}
                              value={quantity}
                              readOnly
                              className="w-12 text-center text-sm font-bold bg-transparent outline-none py-2"
                            />
                            <button 
                              type="button"
                              onClick={() => setQuantity(quantity + 1)}
                              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-ink font-bold transition-colors"
                            >+</button>
                          </div>
                        </div>
                      </div>

                      <div className="mb-5">
                        <label className="block text-xs font-semibold text-ink-soft mb-1.5 uppercase">Delivery Address</label>
                        <div className="flex gap-2">
                          <input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter full address..."
                            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:border-pulse outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={useMyLocationForDelivery}
                            disabled={locatingAddress}
                            className="px-3 bg-slate-50 hover:bg-slate-100 border border-border rounded-lg text-ink transition-colors flex items-center justify-center"
                            title="Use my location"
                          >
                            <Navigation size={18} className={locatingAddress ? "animate-pulse" : ""} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border mb-4">
                        <span className="text-sm font-bold text-ink-soft">Total</span>
                        <span className="text-xl font-bold text-ink">₹{(selectedProduct.price * quantity).toFixed(2)}</span>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleAddToCart}
                          disabled={isPlacingOrder || !user}
                          className="flex-1 btn-secondary py-3.5 justify-center text-ink flex items-center gap-2"
                        >
                          <ShoppingCart size={18} /> Add to Cart
                        </button>
                        <button
                          onClick={handlePlaceOrder}
                          disabled={isPlacingOrder || !address.trim()}
                          className="flex-1 btn-primary py-3.5 text-base justify-center shadow-lg shadow-pulse/20"
                        >
                          {isPlacingOrder ? "Processing..." : "Buy Now"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}