import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./AuthModal.css";

const ERR_MAP = {
  "auth/invalid-credential":   "Wrong email or password.",
  "auth/user-not-found":       "No account with this email.",
  "auth/wrong-password":       "Wrong password.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password":        "Password must be at least 6 characters.",
  "auth/invalid-email":        "Invalid email address.",
  "auth/too-many-requests":    "Too many attempts. Try again later.",
};
const fbErr = (code) => ERR_MAP[code] || "Something went wrong. Try again.";

export default function AuthModal({ initialView = "login", onClose }) {
  const [view, setView] = useState(initialView);
  const [err,  setErr]  = useState("");
  const [ok,   setOk]   = useState("");
  const [busy, setBusy] = useState(false);
  const { login, register, forgotPassword } = useAuth();

  // Login fields
  const [lEmail, setLEmail] = useState("");
  const [lPass,  setLPass]  = useState("");
  // Register fields
  const [rName,  setRName]  = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rPass,  setRPass]  = useState("");
  // Forgot field
  const [fEmail, setFEmail] = useState("");

  const sw = (v) => { setView(v); setErr(""); setOk(""); };

  const doLogin = async (e) => {
    e.preventDefault(); setErr("");
    if (!lEmail || !lPass) { setErr("Fill in all fields."); return; }
    setBusy(true);
    try { await login(lEmail, lPass); onClose(); }
    catch (ex) { setErr(fbErr(ex.code)); }
    setBusy(false);
  };

  const doRegister = async (e) => {
    e.preventDefault(); setErr(""); setOk("");
    if (!rName || !rEmail || !rPass) { setErr("Fill in name, email and password."); return; }
    if (rPass.length < 6)            { setErr("Password must be 6+ characters."); return; }
    setBusy(true);
    try {
      await register(rName, rEmail, rPhone, rPass);
      setOk("Account created! Welcome to NepalBite 🙏");
      setTimeout(onClose, 1500);
    } catch (ex) { setErr(fbErr(ex.code)); }
    setBusy(false);
  };

  const doForgot = async (e) => {
    e.preventDefault(); setErr(""); setOk("");
    if (!fEmail) { setErr("Enter your email."); return; }
    setBusy(true);
    try { await forgotPassword(fEmail); setOk("Reset email sent! Check inbox and spam."); }
    catch (ex) { setErr(fbErr(ex.code)); }
    setBusy(false);
  };

  return (
    <div className="auth-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-box">
        <button className="auth-x" onClick={onClose}>&#x2715;</button>
        <div className="auth-logo">Nepal<span>Bite</span></div>
        <div className="auth-sub">
          {view === "login" ? "Welcome back" : view === "register" ? "Join NepalBite - it's free" : "Reset your password"}
        </div>

        {view !== "forgot" && (
          <div className="auth-tabs">
            <button className={"a-tab" + (view === "login" ? " on" : "")} onClick={() => sw("login")}>Sign In</button>
            <button className={"a-tab" + (view === "register" ? " on" : "")} onClick={() => sw("register")}>Register</button>
          </div>
        )}

        {view === "login" && (
          <form onSubmit={doLogin}>
            <label className="a-lbl">Email</label>
            <input className="form-input" type="email" placeholder="you@email.com" value={lEmail} onChange={(e) => setLEmail(e.target.value)} />
            <label className="a-lbl" style={{ marginTop: ".6rem" }}>Password</label>
            <input className="form-input" type="password" placeholder="Your password" value={lPass} onChange={(e) => setLPass(e.target.value)} />
            <button type="button" className="a-forgot-lnk" onClick={() => sw("forgot")}>Forgot password?</button>
            {err && <p className="a-err">{err}</p>}
            {ok  && <p className="a-ok">{ok}</p>}
            <button className="a-btn" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign In"}</button>
            <p className="a-switch">No account? <span onClick={() => sw("register")}>Register free</span></p>
          </form>
        )}

        {view === "register" && (
          <form onSubmit={doRegister}>
            <label className="a-lbl">Full Name</label>
            <input className="form-input" type="text" placeholder="Ramesh Shrestha" value={rName} onChange={(e) => setRName(e.target.value)} />
            <label className="a-lbl" style={{ marginTop: ".6rem" }}>Email</label>
            <input className="form-input" type="email" placeholder="you@email.com" value={rEmail} onChange={(e) => setREmail(e.target.value)} />
            <label className="a-lbl" style={{ marginTop: ".6rem" }}>Phone (optional)</label>
            <input className="form-input" type="tel" placeholder="+977 98XXXXXXXX" value={rPhone} onChange={(e) => setRPhone(e.target.value)} />
            <label className="a-lbl" style={{ marginTop: ".6rem" }}>Password (min 6 chars)</label>
            <input className="form-input" type="password" placeholder="Your password" value={rPass} onChange={(e) => setRPass(e.target.value)} />
            {err && <p className="a-err">{err}</p>}
            {ok  && <p className="a-ok">{ok}</p>}
            <button className="a-btn" type="submit" disabled={busy}>{busy ? "Creating..." : "Create Account"}</button>
            <p className="a-switch">Already registered? <span onClick={() => sw("login")}>Sign In</span></p>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={doForgot}>
            <p className="a-desc">Enter your email — Firebase sends a reset link instantly.</p>
            <label className="a-lbl">Email Address</label>
            <input className="form-input" type="email" placeholder="you@email.com" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
            {err && <p className="a-err">{err}</p>}
            {ok  && <p className="a-ok">{ok}</p>}
            <button className="a-btn" type="submit" disabled={busy || !!ok}>{busy ? "Sending..." : ok ? "Email Sent" : "Send Reset Email"}</button>
            <p className="a-switch"><span onClick={() => sw("login")}>Back to Sign In</span></p>
          </form>
        )}
      </div>
    </div>
  );
}
