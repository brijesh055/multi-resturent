import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword, sendPasswordResetEmail,
  signOut, onAuthStateChanged
} from "firebase/auth";
import {
  collection, onSnapshot, query, orderBy, limit,
  doc, updateDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import useCursor from "../hooks/useCursor";
import "./Admin.css";

// QR lib — loaded dynamically so it never runs during Vercel build
let QRCode = null;

const DEMO_ORDERS = [
  {id:"NB-A001",item:"Dal Bhat Thali x2",type:"Dine-In",  tableNo:"T-4",customer:"Ramesh S.", total:900, status:"preparing",time:"12:34",phone:"9801234567"},
  {id:"NB-A002",item:"Chicken Momo x3",  type:"Delivery", tableNo:"--",  customer:"Priya M.",  total:840, status:"pending",  time:"12:41",phone:"9812345678"},
  {id:"NB-A003",item:"Thakali Set x1",   type:"Table QR", tableNo:"T-3", customer:"Sita K.",   total:650, status:"ready",    time:"12:28",phone:"9823456789"},
  {id:"NB-A004",item:"Newari Khaja x2",  type:"Dine-In",  tableNo:"T-7", customer:"Bikash G.", total:1040,status:"delivered",time:"12:15",phone:"9834567890"},
  {id:"NB-A005",item:"Masala Chiya x4",  type:"Table QR", tableNo:"T-2", customer:"Anita T.",  total:320, status:"pending",  time:"12:44",phone:"9845678901"},
];
const DEMO_MENU = [
  {id:1,name:"Dal Bhat Thali",cat:"Dal Bhat",  price:450,img:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&q=80",available:true},
  {id:2,name:"Chicken Momo",  cat:"Momos",    price:280,img:"https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=200&q=80",available:true},
  {id:3,name:"Thakali Set",   cat:"Dal Bhat", price:650,img:"https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=200&q=80",available:true},
  {id:4,name:"Newari Khaja",  cat:"Newari",   price:520,img:"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&q=80",available:true},
  {id:5,name:"Chatamari",     cat:"Newari",   price:240,img:"https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200&q=80",available:true},
  {id:6,name:"Juju Dhau",     cat:"Sweets",   price:160,img:"https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&q=80",available:true},
  {id:7,name:"Masala Chiya",  cat:"Drinks",   price:80, img:"https://images.unsplash.com/photo-1556242049-0cfed4f6a45d?w=200&q=80",available:false},
  {id:8,name:"Chicken Curry", cat:"Meat",     price:380,img:"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&q=80",available:true},
];
const DEMO_FEEDBACK = [
  {id:1,name:"Priya Maharjan",rating:5,message:"Best dal bhat! Fast delivery, still hot.",date:"Mar 25, 2025"},
  {id:2,name:"Sujan Thapa",   rating:5,message:"Newari Khaja Set was absolutely authentic.",date:"Mar 24, 2025"},
  {id:3,name:"Aarati S.",     rating:4,message:"Good food, delivery 10 mins late. Still 4 stars.",date:"Mar 24, 2025"},
];
const INV = [
  {name:"Masoor Dal",  unit:"kg",stock:2.3,min:5, status:"critical"},
  {name:"Basmati Rice",unit:"kg",stock:8,  min:10,status:"low"},
  {name:"Desi Ghee",   unit:"L", stock:1.2,min:3, status:"low"},
  {name:"Chicken",     unit:"kg",stock:4,  min:5, status:"low"},
  {name:"Cabbage",     unit:"kg",stock:12, min:5, status:"ok"},
  {name:"Ginger",      unit:"kg",stock:3.5,min:2, status:"ok"},
];

const STATUS_PILL = {
  pending:   ["pill-new",  "Pending"],
  preparing: ["pill-prep", "Preparing"],
  ready:     ["pill-rdy",  "Ready"],
  delivered: ["pill-done", "Delivered"],
  cancelled: ["pill-can",  "Cancelled"],
};

// Safe window — never call at module level or render time
const safeWindow = () => typeof window !== "undefined" ? window : null;

export default function Admin() {
  useCursor();

  const [loggedIn,  setLoggedIn]  = useState(false);
  const [authUser,  setAuthUser]  = useState(null);
  const [loginView, setLoginView] = useState("signin"); // signin | forgot
  const [lEmail,    setLEmail]    = useState("");
  const [lPass,     setLPass]     = useState("");
  const [lErr,      setLErr]      = useState("");
  const [fEmail,    setFEmail]    = useState("");
  const [fErr,      setFErr]      = useState("");
  const [fOk,       setFOk]       = useState("");
  const [lBusy,     setLBusy]     = useState(false);

  const [page,      setPage]      = useState("dashboard");
  const [sbOpen,    setSbOpen]    = useState(false);
  const [toast,     setToast]     = useState("");
  const [toastShow, setToastShow] = useState(false);
  const [orders,    setOrders]    = useState(DEMO_ORDERS);
  const [menuItems, setMenuItems] = useState(DEMO_MENU);
  const [feedback,  setFeedback]  = useState(DEMO_FEEDBACK);
  const [tableCount,setTableCount]= useState(10);
  const [addMenuOpen,setAddMenuOpen]=useState(false);
  const [nmName,    setNmName]    = useState("");
  const [nmCat,     setNmCat]     = useState("Dal Bhat");
  const [nmPrice,   setNmPrice]   = useState("");
  const qrContainers = useRef({});

  const showToast = msg => {
    setToast(msg); setToastShow(true);
    setTimeout(() => setToastShow(false), 2800);
  };

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthUser(u);
      setLoggedIn(!!u);
    });
    return unsub;
  }, []);

  // Live orders from Firestore
  useEffect(() => {
    if (!loggedIn) return;
    try {
      const q = query(collection(db,"orders"), orderBy("createdAt","desc"), limit(50));
      const unsub = onSnapshot(q, snap => {
        if (!snap.empty) {
          const fs = snap.docs.map(d => ({ ...d.data(), id:d.id, firestoreId:d.id }));
          setOrders(fs.length ? fs : DEMO_ORDERS);
        }
      });
      return unsub;
    } catch(e) { /* Firestore not ready */ }
  }, [loggedIn]);

  // QR codes — only in browser
  useEffect(() => {
    if (!loggedIn || page !== "tables") return;
    const win = safeWindow();
    if (!win) return;
    const script = win.document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => { QRCode = win.QRCode; buildQRCodes(); };
    if (!win.QRCode) win.document.head.appendChild(script);
    else { QRCode = win.QRCode; buildQRCodes(); }
  }, [loggedIn, page, tableCount]);

  const buildQRCodes = () => {
    const win = safeWindow();
    if (!win || !win.QRCode) return;
    for (let t = 1; t <= tableCount; t++) {
      const el = win.document.getElementById("qr-" + t);
      if (el && !el.querySelector("canvas")) {
        try {
          new win.QRCode(el, {
            text: win.location.origin + "/table?table=" + t,
            width:70, height:70,
            colorDark:"#0A0A08", colorLight:"#FFFFFF",
          });
        } catch(e) { /* ignore */ }
      }
    }
  };

  const doLogin = async e => {
    e.preventDefault(); setLErr("");
    setLBusy(true);
    try { await signInWithEmailAndPassword(auth, lEmail, lPass); }
    catch (ex) {
      const m = {
        "auth/invalid-credential":"Wrong email or password.",
        "auth/user-not-found":"No account with this email.",
        "auth/too-many-requests":"Too many attempts. Try again later.",
      };
      setLErr(m[ex.code] || "Login failed. Try again.");
    }
    setLBusy(false);
  };

  const doForgot = async e => {
    e.preventDefault(); setFErr(""); setFOk("");
    try { await sendPasswordResetEmail(auth, fEmail); setFOk("Reset email sent! Check your inbox."); }
    catch (ex) { setFErr(ex.code === "auth/user-not-found" ? "No account with this email." : "Error. Try again."); }
  };

  const doLogout = () => signOut(auth).then(() => showToast("Signed out"));

  const updateOrderStatus = async (id, status) => {
    setOrders(prev => prev.map(o => o.id===id ? {...o,status} : o));
    const o = orders.find(x => x.id===id);
    if (o?.firestoreId) {
      try { await updateDoc(doc(db,"orders",o.firestoreId),{status}); }
      catch(e) { /* ignore */ }
    }
    showToast("Order " + id + " → " + status);
  };

  const addMenuItem = async () => {
    if (!nmName) { showToast("Enter item name"); return; }
    const item = { id:Date.now(),name:nmName,cat:nmCat,price:parseInt(nmPrice)||0,
      img:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&q=80",available:true };
    try { await addDoc(collection(db,"menu"),{...item,createdAt:serverTimestamp()}); }
    catch(e) { /* save failed */ }
    setMenuItems(prev => [item, ...prev]);
    setAddMenuOpen(false); setNmName(""); setNmPrice("");
    showToast(nmName + " added to menu");
  };

  const toggleAvailable = id => setMenuItems(prev => prev.map(m => m.id===id ? {...m,available:!m.available} : m));

  const printQR = (tableNum) => {
    const win = safeWindow();
    if (!win) return;
    const url = win.location.origin + "/table?table=" + tableNum;
    const w = win.open("","_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Table ${tableNum} QR</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff;text-align:center;gap:.75rem;padding:2rem}
.logo{font-size:1.6rem;font-weight:900;font-family:Georgia,serif}.logo span{color:#C9973A}
.tnum{font-size:3.5rem;font-weight:900;color:#C9973A;line-height:1}
#qrd{margin:.5rem auto;width:200px}p{font-size:.82rem;color:#666;max-width:240px;line-height:1.55}
.url{font-size:.62rem;color:#aaa;word-break:break-all;max-width:280px}
button{margin-top:1rem;padding:.65rem 1.6rem;background:#C9973A;color:#0A0A08;border:none;border-radius:4px;font-weight:700;cursor:pointer}
@media print{button{display:none}}</style></head>
<body><div class="logo">Nepal<span>Bite</span></div>
<div class="tnum">TABLE ${tableNum}</div>
<div id="qrd"></div>
<p>Scan to view menu and order directly from your phone</p>
<div class="url">${url}</div>
<button onclick="window.print()">Print / Save as PDF</button>
<script>window.onload=function(){new QRCode(document.getElementById('qrd'),{text:'${url}',width:200,height:200,colorDark:'#0A0A08',colorLight:'#FFFFFF'});}<\/script>
</body></html>`);
    w.document.close();
  };

  const exportData = (format, type) => {
    const win = safeWindow();
    if (!win) return;
    const data = type==="orders" ? orders.map(o=>({
      "Order ID":o.id,"Customer":o.customer||"Guest","Items":o.item||"--",
      "Type":o.type||"--","Table":o.tableNo||"--","Total":o.total||0,"Status":o.status
    })) : menuItems.map(m=>({ "Name":m.name,"Category":m.cat,"Price":m.price,"Available":m.available?"Yes":"No" }));
    const keys = Object.keys(data[0]||{});
    if (format==="json") {
      const a=win.document.createElement("a"); a.href="data:application/json,"+encodeURIComponent(JSON.stringify(data,null,2));
      a.download="nepalbite-"+type+".json"; a.click();
    } else {
      const csv=[keys.join(","),...data.map(r=>keys.map(k=>`"${String(r[k]||"").replace(/"/g,'""')}"`).join(","))].join("\n");
      const a=win.document.createElement("a"); a.href="data:text/csv,"+encodeURIComponent(csv);
      a.download="nepalbite-"+type+".csv"; a.click();
    }
    showToast("Exported " + type + " as " + format.toUpperCase());
  };

  const pendingCount = orders.filter(o=>o.status==="pending").length;

  const NAV = [
    {id:"dashboard",label:"Dashboard",   icon:"📊"},
    {id:"orders",   label:"Orders",      icon:"🛒",badge:pendingCount},
    {id:"menu",     label:"Menu Manager",icon:"🍽"},
    {id:"stories",  label:"Stories",     icon:"📸"},
    {id:"analytics",label:"Analytics",   icon:"📈"},
    {id:"feedback", label:"Feedback",    icon:"💬"},
    {id:"inventory",label:"Inventory",   icon:"📦"},
    {id:"tables",   label:"Tables & QR", icon:"🪑"},
    {id:"settings", label:"Settings",    icon:"⚙️"},
  ];

  // ── LOGIN SCREEN ──────────────────────────────
  if (!loggedIn) return (
    <div className="a-login-wrap">
      <div className="a-login-card">
        <div className="al-logo">Nepal<span>Bite</span> <span className="al-admin">Admin</span></div>
        <div className="al-sub">{loginView==="signin"?"Sign in to your dashboard":"Reset your password"}</div>
        <div className="al-tabs">
          <button className={"al-tab"+(loginView==="signin"?" on":"")} onClick={()=>{setLoginView("signin");setLErr("");}}>Sign In</button>
          <button className={"al-tab"+(loginView==="forgot"?" on":"")} onClick={()=>{setLoginView("forgot");setFErr("");setFOk("");}}>Forgot Password</button>
        </div>
        <div className="al-info">First time? Go to <strong>Firebase Console → Authentication → Users → Add User</strong> to create your admin account.</div>
        {loginView==="signin" && (
          <form onSubmit={doLogin}>
            <label className="al-lbl">Email</label>
            <input className="al-inp" type="email" placeholder="admin@nepalbite.com" value={lEmail} onChange={e=>setLEmail(e.target.value)}/>
            <label className="al-lbl" style={{marginTop:".65rem"}}>Password</label>
            <input className="al-inp" type="password" placeholder="Your password" value={lPass} onChange={e=>setLPass(e.target.value)}/>
            {lErr && <p className="al-err">{lErr}</p>}
            <button className="al-btn" type="submit" disabled={lBusy}>{lBusy?"Signing in...":"Sign In"}</button>
          </form>
        )}
        {loginView==="forgot" && (
          <form onSubmit={doForgot}>
            <p style={{fontSize:".78rem",color:"var(--wm)",lineHeight:1.6,marginBottom:".85rem"}}>Enter your admin email. Firebase will send a reset link instantly.</p>
            <label className="al-lbl">Admin Email</label>
            <input className="al-inp" type="email" placeholder="admin@nepalbite.com" value={fEmail} onChange={e=>setFEmail(e.target.value)}/>
            {fErr && <p className="al-err">{fErr}</p>}
            {fOk  && <p className="al-ok">{fOk}</p>}
            <button className="al-btn" type="submit">Send Reset Email</button>
            <button type="button" className="al-back" onClick={()=>setLoginView("signin")}>Back to Sign In</button>
          </form>
        )}
      </div>
    </div>
  );

  // ── MAIN APP ──────────────────────────────────
  return (
    <div className="a-layout">
      <div className="cur-dot"/><div className="cur-ring"/>
      {/* Sidebar overlay */}
      {sbOpen && <div className="sb-ov" onClick={()=>setSbOpen(false)}/>}

      {/* SIDEBAR */}
      <aside className={"a-sidebar"+(sbOpen?" open":"")}>
        <div className="sb-head">
          <div className="sb-logo">Nepal<span>Bite</span></div>
          <button className="sb-x" onClick={()=>setSbOpen(false)}>✕</button>
        </div>
        <div className="sb-role">● Admin Dashboard</div>
        {NAV.map(n=>(
          <div key={n.id} className={"sb-item"+(page===n.id?" on":"")} onClick={()=>{setPage(n.id);setSbOpen(false);}}>
            <span className="sb-ic">{n.icon}</span>
            <span>{n.label}</span>
            {n.badge>0 && <span className="sb-badge">{n.badge}</span>}
          </div>
        ))}
        <div className="sb-foot">
          <div className="sb-av">{(authUser?.email||"A")[0].toUpperCase()}</div>
          <div style={{minWidth:0}}>
            <div className="sb-uname">{authUser?.displayName||authUser?.email?.split("@")[0]||"Admin"}</div>
            <div className="sb-uemail">{authUser?.email||""}</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="a-main">
        {/* Topbar */}
        <div className="a-topbar">
          <div style={{display:"flex",alignItems:"center",gap:".65rem"}}>
            <button className="a-ham" onClick={()=>setSbOpen(true)}><span/><span/><span/></button>
            <div className="a-tb-title"><span className="live-dot"/>  {NAV.find(n=>n.id===page)?.label||"Dashboard"}</div>
          </div>
          <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
            <a href="/" target="_blank" className="a-tb-btn" rel="noreferrer">View Site ↗</a>
            <a href="/table?table=1" target="_blank" className="a-tb-btn" rel="noreferrer">Table Demo ↗</a>
            <button className="a-tb-btn red" onClick={doLogout}>Logout</button>
          </div>
        </div>

        {/* PAGES */}
        <div className="a-pg">

          {/* ── DASHBOARD ── */}
          {page==="dashboard" && (
            <>
              <div className="kpi-row">
                {[["Today's Revenue","₨52,400","↑ 18% vs yesterday","gold"],["Active Orders",orders.filter(o=>["pending","preparing","ready"].includes(o.status)).length,"Live from Firestore","grn"],["Tables Active",tableCount,"QR codes ready",""],["Inventory Alerts",3,"Dal, Rice, Ghee low","red"]].map(([l,v,d,c])=>(
                  <div key={l} className="kpi">
                    <div className="kpi-l">{l}</div>
                    <div className={"kpi-v"+(c?" c-"+c:"")}>{v}</div>
                    <div className={"kpi-d"+(c==="grn"?" c-grn":c==="red"?" c-red":"")}>{d}</div>
                  </div>
                ))}
              </div>
              <div className="a-card">
                <div className="card-t">Recent Orders <span style={{fontSize:".56rem",color:"var(--grn)",fontWeight:400}}>● Live from Firestore</span></div>
                <OrdersTable orders={orders.slice(0,5)} onUpdate={updateOrderStatus}/>
              </div>
            </>
          )}

          {/* ── ORDERS ── */}
          {page==="orders" && (
            <>
              <div className="pg-hd">
                <div className="pg-ht">Orders <span className="live-dot"/></div>
                <div style={{display:"flex",gap:".4rem"}}>
                  <button className="a-exp-btn" onClick={()=>exportData("csv","orders")}>⬇ CSV</button>
                  <button className="a-exp-btn" onClick={()=>exportData("json","orders")}>⬇ JSON</button>
                </div>
              </div>
              <div className="a-card"><OrdersTable orders={orders} onUpdate={updateOrderStatus}/></div>
            </>
          )}

          {/* ── MENU MANAGER ── */}
          {page==="menu" && (
            <>
              <div className="pg-hd">
                <div className="pg-ht">Menu Manager</div>
                <button className="a-add-btn" onClick={()=>setAddMenuOpen(true)}>+ Add Item</button>
              </div>
              <div className="menu-admin-grid">
                {menuItems.map(m=>(
                  <div key={m.id} className="ma-card">
                    <img className="ma-img" src={m.img} alt={m.name} loading="lazy"/>
                    <button className={"ma-tog"+(m.available?" tog-on":" tog-off")} onClick={()=>toggleAvailable(m.id)}>
                      {m.available?"Live":"Hidden"}
                    </button>
                    <div className="ma-body">
                      <div className="ma-cat">{m.cat}</div>
                      <div className="ma-name">{m.name}</div>
                      <div className="ma-price">₨{m.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ANALYTICS ── */}
          {page==="analytics" && (
            <div>
              <div className="pg-ht" style={{marginBottom:"1.25rem"}}>Analytics & AI Insights</div>
              <div className="ana-3">
                {[["Top Items","Chicken Momo 34% · Dal Bhat 28% · Thakali 18%"],["Weekly Peak","Saturday +28% · Sunday +18% · Weekday avg"],["Payment Split","Cash 38% · eSewa 32% · Khalti 18% · Other 12%"]].map(([t,d])=>(
                  <div key={t} className="a-card"><div className="card-t">{t}</div><p style={{fontSize:".78rem",color:"var(--wm)",lineHeight:1.7}}>{d}</p></div>
                ))}
              </div>
              <div className="a-card" style={{marginTop:".85rem"}}>
                <div className="card-t">AI Demand Forecast</div>
                <div className="ai-box"><div className="ai-lbl">Tomorrow's Prediction</div><div className="ai-txt">Revenue: <strong style={{color:"var(--g)"}}>₨58,200</strong> (+11%) · Peak: 12–2pm and 6–8pm · High demand: Momos, Dal Bhat, Chiya</div></div>
                <div className="ai-box"><div className="ai-lbl">Weekend Forecast</div><div className="ai-txt">Saturday +28%. Pre-stock chicken momo (+40%). Add 2 extra staff Sunday. Push table QR promotions.</div></div>
              </div>
            </div>
          )}

          {/* ── FEEDBACK ── */}
          {page==="feedback" && (
            <>
              <div className="pg-hd"><div className="pg-ht">Customer Feedback</div></div>
              <div className="a-card">
                {feedback.map(f=>(
                  <div key={f.id} className="fb-row">
                    <div style={{flexShrink:0}}><div style={{fontWeight:600,fontSize:".78rem"}}>{f.name}</div><div style={{color:"var(--g)",fontSize:".7rem"}}>{"★".repeat(f.rating)}{"☆".repeat(5-f.rating)}</div><div style={{fontSize:".58rem",color:"var(--wd)"}}>{f.date}</div></div>
                    <div style={{flex:1,fontSize:".76rem",color:"var(--wm)",lineHeight:1.6}}>"{f.message}"</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── INVENTORY ── */}
          {page==="inventory" && (
            <>
              <div className="pg-ht" style={{marginBottom:"1.25rem"}}>Inventory</div>
              <div className="a-card">
                <div className="tbl-scroll">
                  <table className="a-table">
                    <thead><tr><th>Item</th><th>Unit</th><th>Stock</th><th>Min Level</th><th>Status</th></tr></thead>
                    <tbody>{INV.map(i=>(
                      <tr key={i.name}>
                        <td style={{fontWeight:500}}>{i.name}</td><td>{i.unit}</td>
                        <td style={{color:i.status==="critical"?"var(--rd)":i.status==="low"?"var(--yw)":"var(--grn)",fontWeight:600}}>{i.stock} {i.unit}</td>
                        <td>{i.min} {i.unit}</td>
                        <td><span className={"pill "+(i.status==="critical"?"pill-can":i.status==="low"?"pill-prep":"pill-new")}>{i.status==="critical"?"Critical":i.status==="low"?"Low":"OK"}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── TABLES & QR ── */}
          {page==="tables" && (
            <>
              <div className="pg-hd">
                <div className="pg-ht">Tables & QR Codes</div>
                <span style={{fontSize:".74rem",color:"var(--wm)"}}>Customers scan to view menu and order</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:"1.25rem",flexWrap:"wrap"}}>
                <span style={{fontSize:".78rem",color:"var(--wm)"}}>Number of Tables:</span>
                <button className="tc-btn" onClick={()=>setTableCount(t=>Math.max(1,t-1))}>−</button>
                <span className="tc-num">{tableCount}</span>
                <button className="tc-btn" onClick={()=>setTableCount(t=>Math.min(50,t+1))}>+</button>
                <button className="a-add-btn" onClick={()=>showToast("QR codes ready for "+tableCount+" tables")}>Save &amp; Generate QR</button>
              </div>
              <div className="qr-grid">
                {Array.from({length:tableCount},(_,i)=>i+1).map(t=>(
                  <div key={t} className="qr-card">
                    <div className="qr-tnum">{t}</div>
                    <div className="qr-box" id={"qr-"+t}/>
                    <div style={{fontSize:".56rem",color:"var(--wd)",wordBreak:"break-all",margin:".5rem 0 .65rem",lineHeight:1.4}}>/table?table={t}</div>
                    <div style={{display:"flex",gap:".32rem",justifyContent:"center",flexWrap:"wrap"}}>
                      <button className="ab-o" onClick={()=>printQR(t)}>🖨 Print QR</button>
                      <a href={"/table?table="+t} target="_blank" rel="noreferrer" className="ab-g" style={{textDecoration:"none"}}>Open</a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── SETTINGS ── */}
          {page==="settings" && (
            <div>
              <div className="pg-ht" style={{marginBottom:"1.2rem"}}>Settings</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1rem"}}>
                <div className="a-card">
                  <div className="card-t">Restaurant Info</div>
                  {[["Restaurant Name","NepalBite Thamel"],["Phone","+977-01-4XXXXXX"],["Address","Thamel Marg, Kathmandu"],["PAN / VAT","600-123-456"]].map(([l,v])=>(
                    <div key={l}><label className="al-lbl" style={{marginTop:".6rem"}}>{l}</label><input className="al-inp" defaultValue={v}/></div>
                  ))}
                  <button className="al-btn" style={{marginTop:".85rem"}} onClick={()=>showToast("Settings saved ✓")}>Save Changes</button>
                </div>
                <div className="a-card">
                  <div className="card-t">Platform Toggles</div>
                  {[["Online Ordering","Accept orders from website",true],["Table QR Ordering","Enable QR ordering system",true],["AI Chatbot (Neela)","Show chatbot to customers",true],["Story Moderation","Require admin approval",true]].map(([t,d,def])=>(
                    <ToggleRow key={t} title={t} desc={d} defaultOn={def}/>
                  ))}
                </div>
                <div className="a-card">
                  <div className="card-t">Firebase Status</div>
                  <div style={{display:"flex",alignItems:"center",gap:".6rem",padding:".75rem",background:"rgba(74,222,128,.08)",border:"1px solid rgba(74,222,128,.2)",borderRadius:"var(--r4)",marginBottom:".85rem"}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:"var(--grn)",flexShrink:0,display:"block"}}/>
                    <div><div style={{fontSize:".78rem",fontWeight:600,color:"var(--grn)"}}>Connected</div><div style={{fontSize:".65rem",color:"var(--wm)"}}>nepalbite-30c26</div></div>
                  </div>
                  {[["Authentication","✓ Enabled"],["Firestore Database","✓ Enabled"],["Firebase Storage","✓ Enabled"]].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:".74rem",color:"var(--wm)",marginBottom:".4rem"}}>
                      <span>{k}</span><span style={{color:"var(--grn)"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STORIES ── */}
          {page==="stories" && (
            <div>
              <div className="pg-hd"><div className="pg-ht">Story Moderation</div></div>
              <div className="sm-grid">
                {[{name:"Sita Sharma",time:"2h ago",cap:"Fresh momos",img:"https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=200&q=80"},
                  {name:"Ramesh K.",  time:"4h ago",cap:"Thakali lunch",img:"https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=200&q=80"},
                  {name:"Pooja Rai",  time:"5h ago",cap:"Dal bhat time",img:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&q=80"},
                ].map((s,i)=>(
                  <div key={i} className="sm-card">
                    <img src={s.img} alt={s.cap} className="sm-img"/>
                    <div className="sm-info">
                      <div style={{fontWeight:600,fontSize:".78rem"}}>{s.name}</div>
                      <div style={{fontSize:".62rem",color:"var(--wm)",margin:".25rem 0 .55rem"}}>{s.cap}</div>
                      <div style={{display:"flex",gap:".32rem"}}>
                        <button className="ab-g" onClick={()=>showToast("Story approved")}>✓ Approve</button>
                        <button className="ab-r" onClick={()=>showToast("Story removed")}>✕ Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>{/* /a-pg */}
      </div>{/* /a-main */}

      {/* ADD MENU MODAL */}
      {addMenuOpen && (
        <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&setAddMenuOpen(false)}>
          <div className="modal-bx">
            <button className="modal-x" onClick={()=>setAddMenuOpen(false)}>✕</button>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.15rem",fontWeight:700,marginBottom:"1.25rem"}}>Add Menu Item</div>
            <label className="al-lbl">Item Name</label>
            <input className="al-inp" placeholder="Dal Bhat Thali" value={nmName} onChange={e=>setNmName(e.target.value)}/>
            <label className="al-lbl" style={{marginTop:".65rem"}}>Category</label>
            <select className="al-inp" value={nmCat} onChange={e=>setNmCat(e.target.value)}>
              {["Dal Bhat","Momos","Newari","Street Food","Meat Dishes","Sweets","Fast Food","Drinks"].map(c=><option key={c}>{c}</option>)}
            </select>
            <label className="al-lbl" style={{marginTop:".65rem"}}>Price (₨)</label>
            <input className="al-inp" type="number" placeholder="350" value={nmPrice} onChange={e=>setNmPrice(e.target.value)}/>
            <button className="al-btn" style={{marginTop:".85rem"}} onClick={addMenuItem}>Add to Menu →</button>
          </div>
        </div>
      )}

      <div className={"toast"+(toastShow?" show":"")}>{toast}</div>
    </div>
  );
}

function OrdersTable({ orders, onUpdate }) {
  return (
    <div className="tbl-scroll">
      <table className="a-table">
        <thead>
          <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Table</th><th>Total</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {orders.map(o=>{
            const [pillCls,pillLabel] = STATUS_PILL[o.status] || ["pill-done","Unknown"];
            return (
              <tr key={o.id}>
                <td style={{color:"var(--g)",fontSize:".68rem"}}>{o.id||o.orderNumber}</td>
                <td style={{fontSize:".72rem"}}>{o.customer||o.customerName||"Guest"}</td>
                <td style={{fontSize:".72rem",maxWidth:140}}>{o.item||"--"}</td>
                <td style={{fontSize:".68rem"}}>{o.tableNo||"--"}</td>
                <td style={{color:"var(--g)",fontWeight:600}}>₨{(o.total||0).toLocaleString()}</td>
                <td><span className={"pill "+pillCls}>{pillLabel}</span></td>
                <td>
                  <div style={{display:"flex",gap:".32rem",flexWrap:"wrap"}}>
                    {o.status==="pending"   && <button className="ab-g" onClick={()=>onUpdate(o.id||o.orderNumber,"preparing")}>Accept</button>}
                    {o.status==="preparing" && <button className="ab-o" onClick={()=>onUpdate(o.id||o.orderNumber,"ready")}>Ready</button>}
                    {o.status==="ready"     && <button className="ab-g" onClick={()=>onUpdate(o.id||o.orderNumber,"delivered")}>Delivered</button>}
                    {["pending","preparing"].includes(o.status) && <button className="ab-r" onClick={()=>onUpdate(o.id||o.orderNumber,"cancelled")}>Cancel</button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ToggleRow({ title, desc, defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="tog-row">
      <div><div style={{fontSize:".8rem",fontWeight:500}}>{title}</div><div style={{fontSize:".64rem",color:"var(--wm)"}}>{desc}</div></div>
      <div className={"tog-track "+(on?"on":"off")} onClick={()=>setOn(v=>!v)}><div className="tog-thumb"/></div>
    </div>
  );
}
