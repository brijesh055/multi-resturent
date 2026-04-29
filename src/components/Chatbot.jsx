import React, { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

const HOUR = typeof window !== "undefined" ? new Date().getHours() : 12;
const TOD  = HOUR < 12 ? "morning" : HOUR < 17 ? "afternoon" : HOUR < 21 ? "evening" : "night";

const QUICK = [
  { label:"😊 Happy mood",   msg:"I'm happy, suggest food!" },
  { label:"😔 Comfort food", msg:"I need comfort food" },
  { label:"🌧 Rainy day",    msg:"It's raining, what to eat?" },
  { label:"💰 Under Rs.200", msg:"Suggest food under 200 rupees" },
  { label:"🌱 Vegetarian",   msg:"I'm vegetarian, what's good?" },
  { label:"🌶 Spicy food",   msg:"I love spicy food" },
  { label:"🥟 Momos info",   msg:"Tell me about your momos" },
  { label:"💳 Payment",      msg:"How can I pay?" },
];

function getBotReply(msg) {
  const m = msg.toLowerCase();
  if (m.includes("happy") || m.includes("celebrat"))
    return "You're in a great mood! Celebrate with:\n\nChicken Momo Rs.280\nNewari Khaja Set Rs.520\nJuju Dhau Rs.160\nThakali Set Rs.650";
  if (m.includes("sad") || m.includes("comfort") || m.includes("down"))
    return "Sending warm hugs! Comfort food:\n\nDal Bhat Thali Rs.450 — like a hug in a bowl\nThukpa Rs.320 — warming noodle soup\nMasala Chiya Rs.80 — Nepal's cure-all";
  if (m.includes("rain") || m.includes("cold") || m.includes("wet"))
    return "Rainy day in Kathmandu!\n\nMasala Chiya Rs.80 — essential for rain\nPakoda Rs.120 — crispy snacks\nThukpa Rs.320 — warming soup\nHot Momos Rs.280 — rain + momos = perfection";
  if (m.includes("200") || m.includes("budget") || m.includes("cheap"))
    return "Best picks under Rs.200:\n\nMasala Chiya — Rs.80\nSamosa — Rs.80\nChatpate — Rs.100\nAloo Chop — Rs.90\nEgg Roll — Rs.150\nJalebi — Rs.120";
  if (m.includes("veg") || m.includes("no meat") || m.includes("plant"))
    return "Best vegetarian options:\n\nVeg Momo Rs.220\nDal Bhat Thali Rs.450\nJuju Dhau Rs.160\nPanipuri Rs.120\nMasala Chiya Rs.80";
  if (m.includes("spicy") || m.includes("chilli") || m.includes("fire"))
    return "Spice lover!\n\nLaphing Rs.160 — VERY spicy\nChicken Momo + spicy achar Rs.280\nFried Chicken Rs.380\nChatpate Rs.100 — maximum chilli";
  if (m.includes("momo") || m.includes("dumpling"))
    return "Our momos:\n\nChicken Momo Rs.280 — most popular!\nBuff Momo Rs.260 — Newari classic\nVeg Momo Rs.220\n\nAll served with secret sesame-tomato achar.";
  if (m.includes("pay") || m.includes("esewa") || m.includes("khalti"))
    return "We accept:\n\neSewa, Khalti, Fonepay QR\nConnectIPS, Debit/Credit Card\nCash on Delivery\n\nAll secure, no extra charges!";
  if (m.includes("deliver") || m.includes("how long"))
    return "Delivery info:\n\nAverage: 28 mins across Kathmandu Valley\nFree delivery above Rs.500\nRs.60 on smaller orders";
  if (TOD === "morning")
    return "Good morning! Start your day:\n\nMasala Chiya Rs.80\nSel Roti Rs.150\nFresh Juice Rs.150";
  if (TOD === "evening" || TOD === "night")
    return "Good evening!\n\nSekuwa Rs.380 — grilled skewers\nMomos + Chiya Rs.360\nTongba Rs.220 — traditional millet brew";
  return "Namaste! I'm Neela, your NepalBite guide!\n\nAsk me about:\nFood by mood, budget, veg/spicy options,\ndelivery info, payment methods.";
}

export default function Chatbot() {
  const [open, setOpen]   = useState(false);
  const [msgs, setMsgs]   = useState([]);
  const [inp,  setInp]    = useState("");
  const msgsRef           = useRef(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = 9999;
  }, [msgs]);

  const openChat = () => {
    setOpen(true);
    if (msgs.length === 0) {
      setMsgs([{ type:"bot", text:`Namaste! I'm Neela, your NepalBite AI guide.\n\nIt's ${TOD} in Kathmandu. Tell me your mood and I'll suggest the perfect dish!` }]);
    }
  };

  const send = (text) => {
    if (!text.trim()) return;
    setMsgs(prev => [...prev, { type:"user", text }]);
    setInp("");
    setTimeout(() => setMsgs(prev => [...prev, { type:"bot", text: getBotReply(text) }]), 450);
  };

  return (
    <>
      <button className="chat-fab" onClick={open ? () => setOpen(false) : openChat} aria-label="Chat with Neela AI">
        &#x1F916;
      </button>

      <div className={"chat-win" + (open ? " open" : "")}>
        <div className="chat-hd">
          <span className="chat-av">&#x1F916;</span>
          <div><div className="chat-nm">Neela AI</div><div className="chat-st">&#x25CF; Online</div></div>
          <button className="chat-xbtn" onClick={() => setOpen(false)}>&#x2715;</button>
        </div>

        <div className="chat-msgs" ref={msgsRef}>
          {msgs.map((m, i) => (
            <div key={i} className={"chat-msg " + m.type}>{m.text}</div>
          ))}
        </div>

        <div className="chat-quicks">
          {QUICK.map(r => (
            <button key={r.msg} className="q-quick" onClick={() => send(r.msg)}>{r.label}</button>
          ))}
        </div>

        <div className="chat-inrow">
          <input className="chat-in" value={inp} onChange={e => setInp(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(inp)} placeholder="Ask me anything..." />
          <button className="chat-send" onClick={() => send(inp)}>&#x2192;</button>
        </div>
      </div>
    </>
  );
}
