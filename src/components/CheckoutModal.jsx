import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./CheckoutModal.css";

const METHODS = [
  { id:"esewa",      icon:"🟢", name:"eSewa",      tag:"Digital Wallet" },
  { id:"khalti",     icon:"💜", name:"Khalti",     tag:"Digital Wallet" },
  { id:"fonepay",    icon:"📱", name:"Fonepay",    tag:"QR Payment"     },
  { id:"connectips", icon:"🏦", name:"ConnectIPS", tag:"Bank Transfer"  },
  { id:"card",       icon:"💳", name:"Card",       tag:"Visa / Master"  },
  { id:"cash",       icon:"💵", name:"Cash",       tag:"On Delivery"    },
];
const PAY_MSG = {
  esewa:"Redirected to eSewa to complete payment.",
  khalti:"Redirected to Khalti wallet.",
  fonepay:"Scan QR code shown after placing order.",
  connectips:"Bank transfer via ConnectIPS.",
  card:"Enter card details on next screen.",
  cash:"Pay cash to the delivery rider.",
};

// Safe window.open — never crashes during Vercel build
const safeOpen = (url, target) => {
  if (typeof window !== "undefined") return window.open(url, target);
  return null;
};

export default function CheckoutModal({ onClose }) {
  const { cart, subtotal, delivery, vat, grandTotal, clearCart } = useCart();
  const { user } = useAuth();

  const [address, setAddress] = useState("");
  const [phone,   setPhone]   = useState("");
  const [pay,     setPay]     = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [success, setSuccess] = useState(false);
  const [order,   setOrder]   = useState(null);

  // Get table number safely — only in browser
  const getTableNo = () => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("table") || null;
  };

  const placeOrder = async () => {
    if (!address || !phone || !pay) return;
    setBusy(true);
    const num  = "NB-" + Math.random().toString(36).toUpperCase().slice(2, 8);
    const data = {
      orderNumber: num,
      items: cart.map(i => ({ id:i.id, name:i.name, qty:i.qty, price:i.price, subtotal:i.price*i.qty })),
      subtotal, delivery, vat, total: grandTotal,
      paymentMethod: pay, deliveryAddress: address, phone,
      status: "pending",
      userId:    user?.uid   || "guest",
      userName:  user?.displayName || "Guest",
      userEmail: user?.email || "",
      tableNo:   getTableNo(),
      createdAt: serverTimestamp(),
    };
    try { await addDoc(collection(db, "orders"), data); }
    catch (e) { console.warn("Order save failed:", e); }
    setOrder({ ...data, orderNumber: num });
    clearCart();
    setSuccess(true);
    setBusy(false);
  };

  const printBill = () => {
    if (!order) return;
    const o = order;
    // safe window.open
    const w = safeOpen("", "_blank");
    if (!w) return;
    const rows = o.items.map(i =>
      `<tr><td>${i.name}</td><td>${i.qty}</td><td>Rs.${i.subtotal.toLocaleString()}</td></tr>`
    ).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>NepalBite Bill #${o.orderNumber}</title>
<style>
body{font-family:sans-serif;max-width:380px;margin:0 auto;padding:1.5rem;font-size:13px;color:#111}
.logo{font-family:Georgia,serif;font-size:1.4rem;font-weight:900;text-align:center;margin-bottom:.25rem}
.logo span{color:#C9973A}
.hd{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:.75rem;margin-bottom:.75rem}
.hd p{font-size:.75rem;color:#555;margin:.15rem 0}
table{width:100%;border-collapse:collapse;margin:.75rem 0}
th{font-size:.7rem;text-align:left;padding:.35rem 0;border-bottom:1px solid #ddd;color:#555;text-transform:uppercase}
td{padding:.35rem 0;border-bottom:1px solid #f0f0f0;font-size:.8rem}
td:last-child{text-align:right;font-weight:500}
.row{display:flex;justify-content:space-between;font-size:.8rem;margin:.25rem 0}
.grand{font-weight:700;font-size:.95rem;margin-top:.5rem;border-top:1px solid #ddd;padding-top:.35rem}
.grand span:last-child{color:#C9973A}
.badge{display:inline-block;background:#f5f0e0;border:1px solid #C9973A;border-radius:3px;padding:.2rem .6rem;font-size:.7rem;font-weight:600;color:#C9973A}
.foot{text-align:center;margin-top:1.25rem;font-size:.7rem;color:#888;border-top:1px dashed #ccc;padding-top:.75rem}
button{display:block;width:100%;margin-top:1rem;padding:.75rem;background:#C9973A;color:#0A0A08;border:none;border-radius:4px;font-weight:700;cursor:pointer}
@media print{button{display:none}}
</style></head><body>
<div class="logo">Nepal<span>Bite</span></div>
<div class="hd"><p>Thamel Marg, Kathmandu, Nepal</p><p>hello@nepalbite.com | PAN: 600-123-456</p></div>
<div style="font-size:.75rem;margin-bottom:.5rem">
<strong>Order:</strong> #${o.orderNumber}<br>
<strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
<strong>Phone:</strong> ${o.phone}<br>
<strong>Address:</strong> ${o.deliveryAddress}${o.tableNo ? "<br><strong>Table:</strong> T-" + o.tableNo : ""}
</div>
<table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
<tbody>${rows}</tbody></table>
<div style="border-top:2px dashed #ccc;padding-top:.75rem;margin-top:.75rem">
<div class="row"><span>Subtotal</span><span>Rs.${o.subtotal.toLocaleString()}</span></div>
<div class="row"><span>Delivery</span><span>${o.delivery === 0 ? "Free" : "Rs." + o.delivery}</span></div>
<div class="row"><span>VAT (13%)</span><span>Rs.${o.vat.toLocaleString()}</span></div>
<div class="row grand"><span>Total</span><span>Rs.${o.total.toLocaleString()}</span></div>
</div>
<div style="text-align:center;margin-top:.75rem"><span class="badge">${o.paymentMethod.toUpperCase()}</span></div>
<div class="foot"><p>Thank you for dining with NepalBite</p><p>www.nepalbite.com</p></div>
<button onclick="window.print()">Print / Save as PDF</button>
</body></html>`);
    w.document.close();
  };

  return (
    <div className="ck-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ck-box">
        <button className="ck-x" onClick={onClose}>&#x2715;</button>

        {!success ? (
          <>
            <div className="ck-title">Complete Your Order</div>
            <div className="ck-sub">Review items, choose payment, and place your order.</div>

            <div className="ck-sec">Order Summary</div>
            <div className="ck-items">
              {cart.map(i => (
                <div key={i.id} className="ck-row">
                  <span>{i.name} &times; {i.qty}</span>
                  <span className="ck-ipr">&#8360;{(i.price * i.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="ck-tots">
              <div className="ck-trow"><span>Subtotal</span><span>&#8360;{subtotal.toLocaleString()}</span></div>
              <div className="ck-trow"><span>Delivery</span><span style={{color:delivery===0?"var(--grn)":"inherit"}}>{delivery===0?"Free":"Rs."+delivery}</span></div>
              <div className="ck-trow"><span>VAT (13%)</span><span>&#8360;{vat.toLocaleString()}</span></div>
              <div className="ck-trow grand-row"><span>Total</span><span className="grand-amt">&#8360;{grandTotal.toLocaleString()}</span></div>
            </div>

            <div className="ck-sec">Delivery Address</div>
            <input className="ck-inp" type="text"  placeholder="Street address, landmark..." value={address} onChange={e=>setAddress(e.target.value)}/>
            <input className="ck-inp" type="tel"   placeholder="+977 98XXXXXXXX"              value={phone}   onChange={e=>setPhone(e.target.value)}/>

            <div className="ck-sec">Payment Method</div>
            <div className="pay-grid">
              {METHODS.map(m => (
                <button key={m.id} className={"pay-opt" + (pay===m.id?" sel":"")} onClick={()=>setPay(m.id)}>
                  <span className="pay-ic">{m.icon}</span>
                  <span className="pay-nm">{m.name}</span>
                  <span className="pay-tg">{m.tag}</span>
                </button>
              ))}
            </div>
            {pay && <div className="pay-msg">{PAY_MSG[pay]}</div>}

            <button className="place-btn" onClick={placeOrder} disabled={!address||!phone||!pay||busy}>
              {busy ? "Placing..." : "Place Order"}
            </button>
          </>
        ) : (
          <div className="suc-view">
            <div style={{fontSize:"3.5rem"}}>&#x1F389;</div>
            <div className="suc-title">Order Placed!</div>
            <div className="suc-msg">
              Order <strong style={{color:"var(--g)"}}>#{order.orderNumber}</strong> confirmed!<br/>
              Total <strong style={{color:"var(--g)"}}>&#8360;{order.total.toLocaleString()}</strong> via {pay?.toUpperCase()}<br/><br/>
              Estimated delivery: <strong>28&#8211;35 minutes</strong><br/>
              We will call you on <strong>{order.phone}</strong>.
            </div>
            <button className="place-btn" style={{width:"100%"}} onClick={onClose}>Continue Browsing</button>
            <button className="print-btn" onClick={printBill}>&#x1F5A8; Print / Download Bill</button>
          </div>
        )}
      </div>
    </div>
  );
}
