import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, ArrowRight, Store, AlertCircle } from "lucide-react";
import apiClient from "../api/axiosClient";

export default function Cart() {
  const { cart, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setError("Please provide a delivery address.");
      return;
    }

    setIsCheckingOut(true);
    setError("");

    try {
      // Loop through all items and place orders individually
      // (Since backend only accepts single-product orders)
      await Promise.all(cart.map(item => 
        apiClient.post("/orders", {
          shop_id: item.shop.shop_id,
          product_id: item.product.product_id,
          quantity: item.quantity,
          delivery_address: address
        })
      ));

      setSuccess(true);
      clearCart();
      
      setTimeout(() => {
        navigate("/my-orders");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to place one or more orders. Some items may be out of stock.");
      setIsCheckingOut(false);
    }
  };

  if (success) {
    return (
      <div className="w-full min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="bg-surface border border-border p-8 rounded-[24px] shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-pulse-soft rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart size={32} className="text-pulse" />
          </div>
          <h2 className="font-display font-bold text-2xl text-ink mb-2">Orders Placed!</h2>
          <p className="text-ink-soft mb-6">Your items have been successfully ordered.</p>
          <p className="text-sm text-ink font-bold animate-pulse">Redirecting to your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-bg min-h-screen pb-16">
      <div className="bg-surface border-b border-border shadow-sm mb-8 pt-8 pb-10">
        <div className="max-w-[1000px] mx-auto px-4 md:px-6">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink tracking-tight mb-3 flex items-center gap-3">
            <ShoppingCart className="text-pulse" size={32} />
            Your Cart
          </h1>
          <p className="text-ink-soft text-sm font-medium">Review your items and complete checkout.</p>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 md:px-6 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 flex flex-col gap-4">
          {cart.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center shadow-sm">
              <ShoppingCart size={48} className="text-ink-soft/30 mx-auto mb-4" />
              <p className="text-ink font-semibold text-lg">Your cart is empty</p>
              <p className="text-ink-soft mt-2 mb-6">Looks like you haven't added anything yet.</p>
              <Link to="/" className="btn-primary">Browse Shops</Link>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.product_id} className="bg-surface border border-border rounded-2xl p-4 flex gap-4 items-center shadow-sm relative group">
                <div className="flex-1">
                  <h3 className="font-bold text-ink text-lg">{item.product.product_name}</h3>
                  <div className="flex items-center gap-1.5 text-ink-soft text-xs font-medium mt-1 mb-3">
                    <Store size={12} className="text-pulse/70" /> {item.shop.name}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-ink">₹{item.product.price}</span>
                    <span className="text-ink-soft text-sm">Qty: {item.quantity}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="font-bold text-xl text-ink">₹{item.product.price * item.quantity}</span>
                  <button 
                    onClick={() => removeFromCart(item.product.product_id)}
                    className="p-2 text-ink-soft hover:text-coral hover:bg-coral-soft rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="w-full lg:w-[380px] shrink-0">
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm sticky top-[100px]">
              <h2 className="font-display font-bold text-xl text-ink mb-6">Order Summary</h2>
              
              <div className="flex justify-between items-center mb-4 text-ink-soft font-medium">
                <span>Subtotal ({cart.length} items)</span>
                <span>₹{calculateTotal()}</span>
              </div>
              <div className="flex justify-between items-center mb-6 text-ink-soft font-medium">
                <span>Delivery Fee</span>
                <span className="text-pulse font-bold">FREE</span>
              </div>
              
              <div className="border-t border-border pt-4 mb-6 flex justify-between items-center">
                <span className="font-bold text-ink text-lg">Total</span>
                <span className="font-bold text-pulse text-2xl">₹{calculateTotal()}</span>
              </div>

              {error && (
                <div className="bg-coral-soft text-coral p-3 rounded-xl text-sm font-medium flex items-start gap-2 mb-4 border border-coral/20">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleCheckout} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-ink mb-1.5">Delivery Address</label>
                  <textarea
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-bg text-ink focus:outline-none focus:border-pulse resize-none h-24 shadow-inner"
                    placeholder="Enter your full delivery address..."
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isCheckingOut}
                  className="w-full btn-primary py-3.5 text-base shadow-lg shadow-pulse/20 mt-2"
                >
                  {isCheckingOut ? "Placing Orders..." : (
                    <>Checkout <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
