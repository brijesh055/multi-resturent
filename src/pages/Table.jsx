import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { MENU, CATEGORIES } from "../data/menu";
import useCursor from "../hooks/useCursor";
import useToast  from "../hooks/useToast";
import "./Table.css";

const TAG_CLS   = t => t==="veg"?"badge-veg":t==="spicy"?"badge-spicy":t==="sweet"?"badge-sweet":"badge-pop";
const TAG_LBL   = t => t==="veg"?"🌱":t==="spicy"?"🌶":t==="sweet"?"🍬":"⭐";
const METHODS   = [
  {id:"esewa",icon:"🟢",name:"eSewa"},{id:"khalti",icon:"💜",name:"Khalti"},
  {id:"fonepay",icon:"📱",name:"Fonepay"},{id:"cash",icon:"💵",name:"Cash"},
];

// Safe: read URL params only in browser
const getTableNo = () => {
  if (typeof window === "undefined") return "1";
  return new URLSearchParams(window.location.search).get("table") || "1";
};

const safeOpen = (url, target) => {
  if (typeof window !== "undefined") return window.open(url, target);
  return null;
};

export default function Table() {
  useCursor();
  const { showToast, ToastEl } = useToast();
  const [tableNo]  = useState(getTableNo);   // called once on mount
  const [cat,      setCat]      = useState("All");
  const [cart,     setCart]     = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [name,     setName]     = useState("");
  const [pay,      setPay]      = useState("cash");
  const [placing,  setPlacing]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [lastOrder,setLastOrder]= useState(null);

  useEffect(() => { document.title = "NepalBite — Table " + tableNo; }, [tableNo]);
  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [cartOpen]);

  const addItem = item => {
    setCart(prev => {
      const ex = prev.find(c=>c.id===item.id);
      if (ex) return prev.map(c=>c.id===item.id?{...c,qty:c.qty+1}:c);
      return [...prev,{...item,qty:1}];
    });
    showToast(item.name+" added");
  };
  const chgQty = (id,delta) => setCart(prev=>prev.map(c=>c.id===id?{...c,qty:c.qty+delta}:c).filter(c=>c.qty>0));
  const subtotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const vat      = Math.round(subtotal*0.13);
  const total    = subtotal+vat;

  const placeOrder = async () => {
    if (!cart.length) { showToast("Add items first"); return; }
    setPlacing(true);
    const num = "NB-T"+tableNo+"-"+Math.random().toString(36).toUpperCase().slice(2,6);
    const data = {
      orderNumber:num,
      tableNo:"T-"+tableNo,
      items:cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price,subtotal:i.price*i.qty})),
      subtotal,vat,total,paymentMethod:pay,
      customerName:name||"Table "+tableNo,
      status:"pending", type:"Table QR",
      createdAt:serverTimestamp(),
    };
    try { await addDoc(collection(db,"orders"),data); }
    catch(e) { console.warn("Order save failed:",e); }
    setLastOrder({...data,orderNumber:num});
    setSuccess(true); setCart([]); setPlacing(false);
  };

  const printBill = () => {
    if (!lastOrder) return;
    const o = lastOrder;
    const w = safeOpen("","_blank");
    if (!w) return;
    const rows = o.items.map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>Rs.${i.subtotal.toLocaleString()}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>NepalBite Bill</title>
<style>body{font-family:sans-serif;max-width:380px;margin:0 auto;padding:1.5rem;font-size:13px}
.logo{font-family:Georgia,serif;font-size:1.4rem;font-weight:900;text-align:center;margin-bottom:.25rem}.logo span{color:#C9973A}
.hd{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:.75rem;margin-bottom:.75rem}
.hd p{font-size:.75rem;color:#555;margin:.15rem 0}
table{width:100%;border-collapse:collapse;margin:.75rem 0}
th{font-size:.7rem;text-align:left;padding:.35rem 0;border-bottom:1px solid #ddd;color:#555;text-transform:uppercase}
td{padding:.35rem 0;border-bottom:1px solid #f0f0f0;font-size:.8rem}td:last-child{text-align:right;font-weight:500}
.row{display:flex;justify-content:space-between;font-size:.8rem;margin:.25rem 0}
.grand{font-weight:700;font-size:.95rem;border-top:1px solid #ddd;padding-top:.35rem;margin-top:.5rem}
.grand span:last-child{color:#C9973A}
button{display:block;width:100%;margin-top:1rem;padding:.75rem;background:#C9973A;color:#0A0A08;border:none;border-radius:4px;font-weight:700;cursor:pointer}
@media print{button{display:none}}</style></head><body>
<div class="logo">Nepal<span>Bite</span></div>
<div class="hd"><p>Table ${o.tableNo} · Thamel, Kathmandu</p><p>Order #${o.orderNumber}</p><p>${new Date().toLocaleDateString()}</p></div>
<table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="row"><span>Subtotal</span><span>Rs.${o.subtotal.toLocaleString()}</span></div>
<div class="row"><span>VAT (13%)</span><span>Rs.${o.vat.toLocaleString()}</span></div>
<div class="row grand"><span>Total</span><span>Rs.${o.total.toLocaleString()}</span></div>
<p style="text-align:center;font-size:.75rem;color:#888;margin-top:1rem">Thank you for dining with NepalBite!</p>
<button onclick="window.print()">Print / Save as PDF</button>
</body></html>`);
    w.document.close();
  };

  const filtered = cat==="All" ? MENU : MENU.filter(m=>m.cat===cat);

  return (
    <>
      <div className="cur-dot"/><div className="cur-ring"/>
      <div className="tbl-page">
        {/* Header */}
        <div className="tbl-header">
          <div className="tbl-logo">Nepal<span>Bite</span></div>
          <div className="tbl-info">Table <span>T-{tableNo}</span> · Scan to order</div>
          <button className="tbl-cart-btn" onClick={()=>setCartOpen(true)}>
            🛒 {cart.reduce((s,i)=>s+i.qty,0)>0&&<span className="tbl-cart-n">{cart.reduce((s,i)=>s+i.qty,0)}</span>}
            {cart.length>0&&<span style={{marginLeft:".3rem",fontSize:".7rem"}}>₨{subtotal.toLocaleString()}</span>}
          </button>
        </div>

        {/* Filters */}
        <div className="tbl-filters">
          {CATEGORIES.map(c=>(
            <button key={c} className={"tbl-fb"+(cat===c?" on":"")} onClick={()=>setCat(c)}>{c}</button>
          ))}
        </div>

        {/* Menu */}
        <div className="tbl-grid">
          {filtered.map(item=>(
            <div key={item.id} className="tbl-card">
              <img src={item.img} alt={item.name} loading="lazy"/>
              <div className="tbl-card-body">
                <div className="tbl-cat">{item.cat}</div>
                <div className="tbl-name">{item.name}</div>
                <div className="tbl-nep">{item.nep}</div>
                <div className="tbl-badges">
                  {item.tags.map(t=><span key={t} className={"badge "+TAG_CLS(t)}>{TAG_LBL(t)}</span>)}
                </div>
                <div className="tbl-desc">{item.desc}</div>
                <div className="tbl-foot">
                  <div className="tbl-price">₨{item.price}</div>
                  {cart.find(c=>c.id===item.id) ? (
                    <div className="tbl-qty-ctrl">
                      <button onClick={()=>chgQty(item.id,-1)}>−</button>
                      <span>{cart.find(c=>c.id===item.id)?.qty}</span>
                      <button onClick={()=>chgQty(item.id,1)}>+</button>
                    </div>
                  ) : (
                    <button className="tbl-add-btn" onClick={()=>addItem(item)}>Add +</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart overlay */}
      {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}/>}
      <div className={"tbl-cart-sd"+(cartOpen?" open":"")}>
        <div className="tbl-cart-head">
          <div className="tbl-cart-title">Your Order · Table T-{tableNo}</div>
          <button onClick={()=>setCartOpen(false)}>✕</button>
        </div>
        <div className="tbl-cart-body">
          {!success ? (
            <>
              {cart.length===0 ? <div className="tbl-cart-empty">No items yet. Browse the menu and add.</div> : (
                <>
                  {cart.map(item=>(
                    <div key={item.id} className="tbl-c-item">
                      <img src={item.img} alt={item.name} loading="lazy"/>
                      <div className="tbl-c-info">
                        <div className="tbl-c-name">{item.name}</div>
                        <div className="tbl-c-pr">₨{(item.price*item.qty).toLocaleString()}</div>
                        <div className="tbl-c-qty">
                          <button onClick={()=>chgQty(item.id,-1)}>−</button>
                          <span>{item.qty}</span>
                          <button onClick={()=>chgQty(item.id,1)}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="tbl-cart-tots">
                    <div className="tbl-tot-row"><span>Subtotal</span><span>₨{subtotal.toLocaleString()}</span></div>
                    <div className="tbl-tot-row"><span>VAT (13%)</span><span>₨{vat.toLocaleString()}</span></div>
                    <div className="tbl-tot-row" style={{fontWeight:700,color:"var(--w)",borderTop:"1px solid rgba(245,240,232,.08)",paddingTop:".45rem",marginTop:".25rem"}}><span>Total</span><span style={{color:"var(--g)",fontFamily:"'Playfair Display',serif",fontSize:"1.1rem"}}>₨{total.toLocaleString()}</span></div>
                  </div>
                  <label className="tbl-lbl">Your Name (optional)</label>
                  <input className="tbl-inp" placeholder="Ramesh" value={name} onChange={e=>setName(e.target.value)}/>
                  <label className="tbl-lbl" style={{marginTop:".5rem"}}>Payment</label>
                  <div className="tbl-pay-grid">
                    {METHODS.map(m=>(
                      <button key={m.id} className={"tbl-pay-opt"+(pay===m.id?" sel":"")} onClick={()=>setPay(m.id)}>
                        <span>{m.icon}</span><span style={{fontSize:".64rem",fontWeight:600}}>{m.name}</span>
                      </button>
                    ))}
                  </div>
                  <button className="tbl-place-btn" onClick={placeOrder} disabled={placing}>{placing?"Placing...":"Place Order"}</button>
                </>
              )}
            </>
          ) : (
            <div className="tbl-success">
              <div style={{fontSize:"3rem"}}>🎉</div>
              <div className="tbl-suc-title">Order Placed!</div>
              <div className="tbl-suc-msg">Order <strong style={{color:"var(--g)"}}>#{lastOrder?.orderNumber}</strong><br/>Total: <strong style={{color:"var(--g)"}}>₨{lastOrder?.total?.toLocaleString()}</strong><br/><br/>Your food is being prepared! A staff member will bring it to <strong>Table T-{tableNo}</strong>.</div>
              <button className="tbl-place-btn" onClick={()=>{setSuccess(false);setCartOpen(false);}}>Order More</button>
              <button className="tbl-print-btn" onClick={printBill}>🖨 Print Bill</button>
            </div>
          )}
        </div>
      </div>

      {ToastEl}
    </>
  );
}
