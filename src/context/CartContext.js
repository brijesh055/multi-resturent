import React, { createContext, useContext, useState, useCallback } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart,     setCart]     = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const addToCart = useCallback(item => {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const changeQty = useCallback((id, delta) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const subtotal   = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalQty   = cart.reduce((s, i) => s + i.qty, 0);
  const delivery   = subtotal >= 500 ? 0 : 60;
  const vat        = Math.round(subtotal * 0.13);
  const grandTotal = subtotal + delivery + vat;

  return (
    <CartContext.Provider value={{
      cart, cartOpen, setCartOpen,
      addToCart, changeQty, clearCart,
      subtotal, delivery, vat, grandTotal, totalQty,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
