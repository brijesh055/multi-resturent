import React from "react";
import { useCart } from "../context/CartContext";
import "./CartSidebar.css";

export default function CartSidebar({ onCheckout }) {
  const { cart, cartOpen, setCartOpen, changeQty, subtotal } = useCart();

  return (
    <>
      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)} />}
      <div className={"cart-sd" + (cartOpen ? " open" : "")}>
        <div className="cart-hd">
          <div className="cart-title">Your Cart</div>
          <button className="cart-x" onClick={() => setCartOpen(false)}>✕</button>
        </div>

        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div style={{fontSize:"2.6rem",opacity:.35}}>🛒</div>
              <div style={{fontWeight:500}}>Your cart is empty</div>
              <div style={{fontSize:".72rem",color:"var(--wd)"}}>Browse the menu and add items</div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="c-img">
                  <img src={item.img} alt={item.name} loading="lazy" />
                </div>
                <div className="c-info">
                  <div className="c-name">{item.name}</div>
                  <div className="c-price">&#8360;{(item.price * item.qty).toLocaleString()}</div>
                  <div className="c-qty">
                    <button className="q-btn" onClick={() => changeQty(item.id, -1)}>&#8722;</button>
                    <span className="q-num">{item.qty}</span>
                    <button className="q-btn" onClick={() => changeQty(item.id, 1)}>&#43;</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-foot">
            <div className="cart-sub-row">
              <span>Subtotal</span>
              <span className="cart-sub-val">&#8360;{subtotal.toLocaleString()}</span>
            </div>
            <div style={{fontSize:".68rem",color:"var(--wd)",marginBottom:".25rem"}}>
              Delivery + 13% VAT calculated at checkout
            </div>
            <button className="cart-ck-btn" onClick={() => { setCartOpen(false); onCheckout(); }}>
              Proceed to Checkout &rarr;
            </button>
          </div>
        )}
      </div>
    </>
  );
}
