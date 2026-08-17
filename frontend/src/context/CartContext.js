import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('sp_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sp_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, shop, quantity) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.product_id === product.product_id);
      if (existing) {
        return prev.map(item => 
          item.product.product_id === product.product_id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { id: Date.now(), product, shop, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}
