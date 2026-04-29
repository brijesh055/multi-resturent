import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { MENU, CATEGORIES, FAMOUS_ITEMS } from "../data/menu";
import Navbar        from "../components/Navbar";
import CartSidebar   from "../components/CartSidebar";
import CheckoutModal from "../components/CheckoutModal";
import Chatbot       from "../components/Chatbot";
import useCursor     from "../hooks/useCursor";
import useToast      from "../hooks/useToast";
import "./Home.css";

// ── Story data ────────────────────────────────────
const STORIES = {
  today:[
    {id:1,name:"Sita Sharma",av:"https://randomuser.me/api/portraits/women/44.jpg",cap:"Fresh steamed momos!",time:"2h ago",img:"https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80"},
    {id:2,name:"Ramesh K.",  av:"https://randomuser.me/api/portraits/men/32.jpg",  cap:"Thakali lunch today",time:"4h ago",img:"https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400&q=80"},
    {id:3,name:"Pooja Rai",  av:"https://randomuser.me/api/portraits/women/65.jpg",cap:"Sunday dal bhat",  time:"5h ago",img:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80"},
    {id:4,name:"Bikash G.",  av:"https://randomuser.me/api/portraits/men/55.jpg",  cap:"Newari feast!",    time:"6h ago",img:"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80"},
    {id:5,name:"Anita T.",   av:"https://randomuser.me/api/portraits/women/22.jpg",cap:"Chowmein lunch",   time:"8h ago",img:"https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80"},
  ],
  yesterday:[
    {id:6,name:"Sunil M.",av:"https://randomuser.me/api/portraits/men/11.jpg",  cap:"Late night momos",time:"Yesterday 10pm",img:"https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80"},
    {id:7,name:"Priya S.", av:"https://randomuser.me/api/portraits/women/33.jpg",cap:"Birthday dinner",  time:"Yesterday 7pm",img:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80"},
  ],
  twodaysago:[
    {id:8,name:"Meera J.",av:"https://randomuser.me/api/portraits/women/12.jpg",cap:"Sel roti morning",time:"2 days ago",img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80"},
  ],
};

// ── Gallery data ──────────────────────────────────
const buildGallery = () => {
  const today = new Date();
  const gd = { today:[
    {img:"https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80",name:"Chicken Momos",by:"@sita_eats",time:"3h ago"},
    {img:"https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400&q=80",name:"Thakali Thali",by:"@ramesh_k",time:"5h ago"},
    {img:"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",name:"Newari Bara",  by:"@pooja_r", time:"6h ago"},
    {img:"https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80",name:"Chowmein",     by:"@bikash_g",time:"7h ago"},
    {img:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80",name:"Dal Bhat",     by:"@anita_t", time:"9h ago"},
  ]};
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = d.toISOString().split("T")[0];
    gd[k] = [
      {img:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80",name:"Dal Bhat",by:"@u"+i+"a",time:i+"d ago"},
      {img:"https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80",name:"Momos",   by:"@u"+i+"b",time:i+"d ago"},
      {img:"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",name:"Newari",  by:"@u"+i+"c",time:i+"d ago"},
    ];
  }
  return gd;
};

const TAG_CLS   = t => t==="veg"?"badge-veg":t==="spicy"?"badge-spicy":t==="sweet"?"badge-sweet":"badge-pop";
const TAG_LBL   = t => t==="veg"?"🌱 Veg":t==="spicy"?"🌶 Spicy":t==="sweet"?"🍬 Sweet":"⭐ Popular";

export default function Home() {
  useCursor();
  const { showToast, ToastEl } = useToast();
  const { addToCart, setCartOpen } = useCart();
  const { user } = useAuth();

  const [menuFilter,  setMenuFilter]  = useState("All");
  const [searchQ,     setSearchQ]     = useState("");
  const [ckOpen,      setCkOpen]      = useState(false);
  const [storyDay,    setStoryDay]    = useState("today");
  const [localStories,setLocalStories]= useState(STORIES);
  const [stViewer,    setStViewer]    = useState(false);
  const [stIdx,       setStIdx]       = useState(0);
  const [stTimer,     setStTimer]     = useState(null);
  const [galDay,      setGalDay]      = useState("today");
  const [galData,     setGalData]     = useState(null);
  const [dateChips,   setDateChips]   = useState([]);
  const [upOpen,      setUpOpen]      = useState(false);
  const [upCap,       setUpCap]       = useState("");
  const [upName,      setUpName]      = useState("");
  const [upPreview,   setUpPreview]   = useState(null);
  const [rating,      setRating]      = useState(0);
  const [fbName,      setFbName]      = useState("");
  const [fbEmail,     setFbEmail]     = useState("");
  const [fbMsg,       setFbMsg]       = useState("");
  const fileRef = useRef(null);

  // Build gallery + date chips on mount (client only)
  useEffect(() => {
    const gd = buildGallery();
    setGalData(gd);
    const today = new Date();
    const chips = [{ key:"today", label:"Today", day:today.toLocaleDateString("en",{weekday:"short"}), cnt:gd.today.length }];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const k = d.toISOString().split("T")[0];
      chips.push({ key:k, label:String(d.getDate()), day:d.toLocaleDateString("en",{month:"short"}), cnt:(gd[k]||[]).length + Math.floor(Math.random()*3)+1 });
    }
    setDateChips(chips);
  }, []);

  // Story timer
  useEffect(() => {
    if (!stViewer) return;
    const cur = localStories[storyDay] || [];
    if (!cur.length) return;
    const t = setTimeout(() => {
      if (stIdx < cur.length - 1) setStIdx(i => i + 1);
      else setStViewer(false);
    }, 5000);
    setStTimer(t);
    return () => clearTimeout(t);
  }, [stViewer, stIdx, storyDay, localStories]);

  const openStory = (idx, day) => {
    clearTimeout(stTimer);
    setStoryDay(day);
    setStIdx(idx);
    setStViewer(true);
  };
  const prevSt = () => { clearTimeout(stTimer); if (stIdx > 0) setStIdx(i => i - 1); };
  const nextSt = () => {
    clearTimeout(stTimer);
    const cur = localStories[storyDay] || [];
    if (stIdx < cur.length - 1) setStIdx(i => i + 1); else setStViewer(false);
  };

  const handleAdd = useCallback(item => {
    addToCart(item);
    showToast(item.name + " added to cart 🛒");
  }, [addToCart, showToast]);

  const handleSearch = () => {
    setMenuFilter("All");
    const el = document.getElementById("menu");
    if (el) el.scrollIntoView({ behavior:"smooth" });
  };

  const filteredMenu = MENU.filter(m => {
    const matchCat = menuFilter === "All" || m.cat === menuFilter;
    const matchQ   = !searchQ || m.name.toLowerCase().includes(searchQ.toLowerCase()) || m.cat.toLowerCase().includes(searchQ.toLowerCase());
    return matchCat && matchQ;
  });

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setUpPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!upCap) { showToast("Please add a caption ✍️"); return; }
    const name = upName || (user?.displayName) || "Anonymous";
    const img  = upPreview || "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80";
    try {
      await addDoc(collection(db,"stories"),{
        userName:name, caption:upCap, imageUrl:img, approved:false,
        createdAt:serverTimestamp(), expiresAt:new Date(Date.now()+86400000),
      });
    } catch(e) { /* save failed — local only */ }
    setLocalStories(prev => ({
      ...prev,
      today:[{ id:Date.now(),name,av:"https://randomuser.me/api/portraits/lego/1.jpg",cap:upCap,time:"Just now",img },
             ...prev.today],
    }));
    if (galData) {
      setGalData(prev => ({ ...prev, today:[{img,name:upCap,by:"@"+name.split(" ")[0].toLowerCase(),time:"Just now"},...prev.today] }));
    }
    setUpOpen(false); setUpCap(""); setUpName(""); setUpPreview(null);
    showToast("Story posted! Pending approval ✨");
  };

  const submitFeedback = async () => {
    if (!fbName)  { showToast("Please enter your name"); return; }
    if (!rating)  { showToast("Please select a rating ⭐"); return; }
    if (!fbMsg)   { showToast("Please write a message"); return; }
    try {
      await addDoc(collection(db,"feedback"),{
        name:fbName, email:fbEmail, message:fbMsg, rating,
        createdAt:serverTimestamp(),
      });
    } catch(e) { /* save failed */ }
    showToast("Thank you " + fbName + "! Feedback saved 🙏");
    setFbName(""); setFbEmail(""); setFbMsg(""); setRating(0);
  };

  const TODAY_LABEL = new Date().toLocaleDateString("en-NP",{month:"short",day:"numeric"});
  const YEST_LABEL  = (() => { const d=new Date(); d.setDate(d.getDate()-1); return d.toLocaleDateString("en-NP",{month:"short",day:"numeric"}); })();
  const Y2_LABEL    = (() => { const d=new Date(); d.setDate(d.getDate()-2); return d.toLocaleDateString("en-NP",{month:"short",day:"numeric"}); })();

  const curStories = localStories[storyDay] || [];

  return (
    <>
      <div className="cur-dot" /><div className="cur-ring" />
      <Navbar />

      {/* ── HERO ── */}
      <section className="hero" id="home">
        <div className="hero-bg" />
        <div className="hero-c">
          <div className="hero-pill">🇳🇵 Authentic Nepali Flavours · Kathmandu</div>
          <h1>Taste <em>Nepal</em><br/>At Its Best</h1>
          <p className="hero-sub">Order from Nepal's finest restaurants, explore rich culinary heritage, and share your food stories.</p>
          <div className="h-search">
            <input type="text" placeholder="Search momos, dal bhat, thukpa…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/>
            <button onClick={handleSearch}>Find Food</button>
          </div>
          <div className="h-tags">
            {["Dal Bhat","Momos","Newari","Street Food","Sweets","Drinks"].map(c=>(
              <div key={c} className="h-tag" onClick={()=>{setMenuFilter(c);document.getElementById("menu")?.scrollIntoView({behavior:"smooth"})}}>
                {c==="Dal Bhat"?"🍛":c==="Momos"?"🥟":c==="Newari"?"🎋":c==="Street Food"?"🌶":c==="Sweets"?"🍰":"☕"} {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORIES ── */}
      <section className="stories-wrap" id="stories">
        <div className="st-hd">
          <div className="st-lbl">Today's Stories · <span>{TODAY_LABEL}</span></div>
          <div className="st-pills">
            <button className={"st-pill"+(storyDay==="today"?" on":"")} onClick={()=>setStoryDay("today")}>Today</button>
            <button className={"st-pill"+(storyDay==="yesterday"?" on":"")} onClick={()=>setStoryDay("yesterday")}>{YEST_LABEL}</button>
            <button className={"st-pill"+(storyDay==="twodaysago"?" on":"")} onClick={()=>setStoryDay("twodaysago")}>{Y2_LABEL}</button>
          </div>
        </div>
        <div className="st-scroll">
          <div className="st-track">
            <div className="st-item" onClick={()=>setUpOpen(true)}>
              <div className="st-ring" style={{background:"rgba(201,151,58,.2)"}}>
                <div className="st-add">📷</div>
              </div>
              <div className="st-name">Your Story</div>
              <div className="st-time">Tap to add</div>
            </div>
            {curStories.map((s,i)=>(
              <div key={s.id} className="st-item" onClick={()=>openStory(i,storyDay)}>
                <div className="st-ring">
                  <div className="st-inner"><img src={s.av} alt={s.name} loading="lazy"/></div>
                </div>
                <div className="st-name">{s.name.split(" ")[0]}</div>
                <div className="st-time">{s.time}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORY VIEWER ── */}
      {stViewer && (
        <div className="sv-wrap" onClick={()=>setStViewer(false)}>
          <div className="sv-frame" onClick={e=>e.stopPropagation()}>
            <div className="sv-progress">
              {curStories.map((_,i)=>(
                <div key={i} className="sv-bar">
                  <div className={"sv-fill"+(i<stIdx?" done":i===stIdx?" run":"")}/>
                </div>
              ))}
            </div>
            <button className="sv-x" onClick={()=>setStViewer(false)}>✕</button>
            <button className="sv-prev" onClick={prevSt}>‹</button>
            <button className="sv-next" onClick={nextSt}>›</button>
            <img className="sv-img" src={curStories[stIdx]?.img} alt={curStories[stIdx]?.cap}/>
            <div className="sv-info">
              <div className="sv-author">
                <img className="sv-av" src={curStories[stIdx]?.av} alt=""/>
                <div>
                  <div className="sv-uname">{curStories[stIdx]?.name}</div>
                  <div className="sv-utime">{curStories[stIdx]?.time}</div>
                </div>
              </div>
              <div className="sv-cap">{curStories[stIdx]?.cap}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── FAMOUS DISHES ── */}
      <section className="sec bg1 bt" id="famous">
        <div className="ctr">
          <div style={{textAlign:"center",marginBottom:".5rem"}}>
            <div className="eye">Signature Selection</div>
            <h2 className="sec-t">Famous Dishes at <em>NepalBite</em></h2>
            <p style={{fontSize:".82rem",color:"var(--wm)",maxWidth:500,margin:"0 auto"}}>Our most-loved plates — each a story of Nepal's culinary soul.</p>
          </div>
          <div className="fam-grid">
            {FAMOUS_ITEMS.map(f=>(
              <div key={f.id} className="fc">
                <img className="fc-img" src={f.img} alt={f.name} loading="lazy"/>
                <div className="fc-badge">★ Signature</div>
                <div className="fc-body">
                  <div className="fc-nep">{f.nep}</div>
                  <div className="fc-name">{f.name}</div>
                  <div className="fc-tags">
                    {f.tags.map(t=><span key={t} className={"badge "+TAG_CLS(t)}>{TAG_LBL(t)}</span>)}
                  </div>
                  <div className="fc-desc">{f.famDesc}</div>
                  <div className="fc-foot">
                    <div className="fc-price">₨{f.price}</div>
                    <button className="add-btn" onClick={()=>handleAdd(f)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MENU ── */}
      <section className="sec" id="menu">
        <div className="ctr">
          <div className="eye">Our Full Menu</div>
          <h2 className="sec-t">Every Flavour of <em>Nepal</em></h2>
          <div className="m-filters">
            {CATEGORIES.map(c=>(
              <button key={c} className={"mfb"+(menuFilter===c?" on":"")} onClick={()=>setMenuFilter(c)}>{c}</button>
            ))}
          </div>
          <div className="m-grid">
            {filteredMenu.map(m=>(
              <div key={m.id} className="mc">
                <img className="mc-img" src={m.img} alt={m.name} loading="lazy"/>
                <div className="mc-body">
                  <div className="mc-cat">{m.cat}</div>
                  <div className="mc-name">{m.name} <span className="mc-nep">{m.nep}</span></div>
                  <div className="mc-badges">
                    {m.tags.map(t=><span key={t} className={"badge "+TAG_CLS(t)}>{TAG_LBL(t)}</span>)}
                  </div>
                  <div className="mc-desc">{m.desc}</div>
                  <div className="mc-foot">
                    <div className="mc-price">₨{m.price} <span>/ serving</span></div>
                    <button className="add-btn" onClick={()=>handleAdd(m)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section className="sec bg1 bt" id="gallery">
        <div className="ctr">
          <div className="gal-hd">
            <div>
              <div className="eye">Customer Stories Gallery</div>
              <h2 className="sec-t">Moments from <em>Our Community</em></h2>
              <p style={{fontSize:".78rem",color:"var(--wm)",marginTop:".4rem"}}>Stories expire after 24 hours · Browse archive by date</p>
            </div>
            <button className="btn-gold" onClick={()=>setUpOpen(true)}>+ Share Story</button>
          </div>
          <div className="date-chips">
            {dateChips.map(c=>(
              <div key={c.key} className={"d-chip"+(galDay===c.key?" on":"")} onClick={()=>setGalDay(c.key)}>
                <div className="dc-num">{c.label}</div>
                <div className="dc-day">{c.day}</div>
                <div className="dc-cnt">{c.cnt} stories</div>
              </div>
            ))}
          </div>
          <div className="gal-grid">
            <div className="gal-up" onClick={()=>setUpOpen(true)}>
              <div style={{fontSize:"1.4rem",color:"var(--g)"}}>📷</div>
              <div style={{fontSize:".62rem",color:"var(--wm)",textAlign:"center",lineHeight:1.4}}>Share your story<br/><span style={{color:"var(--g)",fontSize:".58rem"}}>Visible 24 hours</span></div>
            </div>
            {(galData?.[galDay] || []).map((it,i)=>(
              <div key={i} className="gal-item">
                <img src={it.img} alt={it.name} loading="lazy"/>
                <div className="gal-ov"/>
                <div className="gal-info"><div className="gal-iname">{it.name}</div><div style={{fontSize:".56rem",color:"var(--wm)"}}>{it.by} · {it.time}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="sec" id="testimonials">
        <div className="ctr">
          <div style={{textAlign:"center"}}><div className="eye">What People Say</div><h2 className="sec-t">Loved by <em>Thousands</em></h2></div>
          <div className="testi-grid">
            {[
              {av:"P",name:"Priya Maharjan",role:"Regular Customer, Lalitpur",txt:"The best dal bhat outside my mum's kitchen. Fast delivery, still hot!"},
              {av:"S",name:"Sujan Thapa",   role:"Food Enthusiast, Kathmandu",txt:"Live stories before ordering shows the food is fresh. Gallery archive is so unique!"},
              {av:"A",name:"Aarati Shrestha",role:"Customer, Bhaktapur",       txt:"Finding real Newari food was a challenge. NepalBite changed that completely!"},
            ].map(t=>(
              <div key={t.name} className="testi-card">
                <div className="testi-stars">★★★★★</div>
                <div className="testi-txt">"{t.txt}"</div>
                <div className="testi-author"><div className="testi-av">{t.av}</div><div><div style={{fontWeight:600,fontSize:".8rem"}}>{t.name}</div><div style={{fontSize:".65rem",color:"var(--wm)"}}>{t.role}</div></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="sec bg1 bt" id="about">
        <div className="ctr">
          <div className="about-grid">
            <div className="about-text">
              <div><div className="eye">Our Story</div><h2 className="sec-t">Food is <em>Culture.</em><br/>We Protect Both.</h2></div>
              <p style={{fontSize:".86rem",color:"var(--wm)",lineHeight:1.75}}>Born in the lanes of Thamel, NepalBite was founded by food-lovers who believed Nepal's extraordinary culinary heritage deserved a modern digital home.</p>
              <p style={{fontSize:".86rem",color:"var(--wm)",lineHeight:1.75}}>From grandmothers' secret recipes in Patan to cloud kitchens in New Baneshwor — we connect every corner of Nepal's food culture with people who love to eat.</p>
              <div className="vals-grid">
                {[["🇳🇵","Made in Nepal","100% local team, built for Nepal's food culture."],["🌱","Fresh Always","We verify freshness for every partner restaurant."],["⚡","Fast Delivery","Average 28 minutes across Kathmandu Valley."],["❤️","Community First","Supporting local restaurants, farmers, livelihoods."]].map(([ic,t,d])=>(
                  <div key={t} className="val-card"><div style={{fontSize:".95rem",marginBottom:".3rem"}}>{ic}</div><div style={{fontSize:".78rem",fontWeight:600,color:"var(--w)",marginBottom:".18rem"}}>{t}</div><div style={{fontSize:".68rem",color:"var(--wm)",lineHeight:1.45}}>{d}</div></div>
                ))}
              </div>
            </div>
            <div className="about-imgs">
              <div className="aimg"><img src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80" alt="Nepali food" loading="lazy"/></div>
              <div className="aimg"><img src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&q=80" alt="Restaurant"  loading="lazy"/></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="sec" id="contact">
        <div className="ctr">
          <div style={{textAlign:"center",marginBottom:"2.5rem"}}><div className="eye">Get In Touch</div><h2 className="sec-t">We're Always <em>Here</em></h2></div>
          <div className="contact-grid">
            <div className="contact-info">
              {[["📍","Location","Thamel Marg, Kathmandu · Nepal 44600"],["📞","Phone","+977-01-4XXXXXX · +977-9800000000"],["✉️","Email","hello@nepalbite.com"],["🕐","Hours","Open 7 days · 10 AM – 10 PM NST"]].map(([ic,lb,val])=>(
                <div key={lb} className="c-item"><div className="c-icon">{ic}</div><div><div className="c-lbl">{lb}</div><div className="c-val">{val}</div></div></div>
              ))}
              <div className="map-ph">📍 Thamel, Kathmandu — Google Maps</div>
            </div>
            <div className="fb-box">
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.15rem",fontWeight:700,marginBottom:".3rem"}}>Your <span style={{color:"var(--g)"}}>Feedback</span></h3>
              <p style={{fontSize:".74rem",color:"var(--wm)",marginBottom:".5rem"}}>Rate your experience and help us improve</p>
              <div className="star-row">
                {[1,2,3,4,5].map(n=>(
                  <span key={n} className={"star"+(rating>=n?" lit":"")} onClick={()=>setRating(n)}>★</span>
                ))}
              </div>
              <label className="fb-lbl">Your Name</label>
              <input className="form-input" type="text"  placeholder="Ramesh Shrestha" value={fbName}  onChange={e=>setFbName(e.target.value)}/>
              <label className="fb-lbl" style={{marginTop:".6rem"}}>Email (optional)</label>
              <input className="form-input" type="email" placeholder="you@example.com"  value={fbEmail} onChange={e=>setFbEmail(e.target.value)}/>
              <label className="fb-lbl" style={{marginTop:".6rem"}}>Your Message</label>
              <textarea className="form-input" rows={3} placeholder="Tell us about your experience…" style={{resize:"none",lineHeight:1.5}} value={fbMsg} onChange={e=>setFbMsg(e.target.value)}/>
              <button className="btn-gold" style={{width:"100%",marginTop:".85rem",padding:".78rem"}} onClick={submitFeedback}>Send Feedback →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="ctr">
          <div className="footer-grid">
            <div><div className="f-logo">Nepal<span>Bite</span></div><p className="f-desc">Nepal's favourite food-tech platform — connecting authentic restaurants with hungry customers since 2022.</p><div style={{display:"flex",gap:".4rem"}}>{["f","in","ig","yt"].map(s=><div key={s} className="f-soc">{s}</div>)}</div></div>
            <div><div className="f-col-t">Discover</div><ul className="f-links"><li><a href="#famous">Signature Dishes</a></li><li><a href="#menu">Browse Menu</a></li><li><a href="#gallery">Stories Gallery</a></li><li><a href="#about">About Us</a></li></ul></div>
            <div><div className="f-col-t">Support</div><ul className="f-links"><li><a href="#contact">Contact Us</a></li><li><a href="#contact">Leave Feedback</a></li><li><a href="#contact">Help Center</a></li></ul></div>
            <div><div className="f-col-t">For Restaurants</div><ul className="f-links"><li><a href="/admin">Admin Login</a></li><li><a href="/table">Table QR Menu</a></li><li><a href="#contact">Partner With Us</a></li></ul></div>
          </div>
          <div className="f-bottom"><span>© 2025 NepalBite Technology Pvt. Ltd. · Kathmandu, Nepal</span><span>Made with ❤️ in Kathmandu</span></div>
        </div>
      </footer>

      {/* ── UPLOAD MODAL ── */}
      {upOpen && (
        <div className="up-ov" onClick={e=>e.target===e.currentTarget&&setUpOpen(false)}>
          <div className="up-box">
            <button className="up-x" onClick={()=>setUpOpen(false)}>✕</button>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontWeight:700,marginBottom:".3rem"}}>Share Your Story</h3>
            <p style={{fontSize:".74rem",color:"var(--wm)",marginBottom:"1.2rem",lineHeight:1.5}}>Your photo will be visible for <strong>24 hours</strong>, then auto-archived.</p>
            {!upPreview ? (
              <div className="up-dz" onClick={()=>fileRef.current?.click()}>
                <div style={{fontSize:"1.7rem",marginBottom:".45rem"}}>📷</div>
                <div style={{fontSize:".78rem",color:"var(--wm)"}}>Tap to choose a photo</div>
                <div style={{fontSize:".63rem",color:"var(--wd)",marginTop:".2rem"}}>JPG · PNG · Max 10MB</div>
              </div>
            ) : (
              <img className="up-preview" src={upPreview} alt="preview"/>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFileChange}/>
            <label className="fb-lbl">Caption</label>
            <input className="form-input" type="text" placeholder="What are you eating? 🍛" value={upCap} onChange={e=>setUpCap(e.target.value)}/>
            <label className="fb-lbl" style={{marginTop:".5rem"}}>Your Name</label>
            <input className="form-input" type="text" placeholder="Your name" value={upName} onChange={e=>setUpName(e.target.value)}/>
            <button className="btn-gold" style={{width:"100%",marginTop:".85rem",padding:".78rem"}} onClick={handleUpload}>Post Story →</button>
          </div>
        </div>
      )}

      <CartSidebar onCheckout={()=>setCkOpen(true)} />
      {ckOpen && <CheckoutModal onClose={()=>setCkOpen(false)} />}
      <Chatbot />
      {ToastEl}
    </>
  );
}
