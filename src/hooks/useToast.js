import { useState, useCallback, useRef } from "react";

export default function useToast() {
  const [msg,  setMsg]  = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  const showToast = useCallback(message => {
    setMsg(message);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2800);
  }, []);

  const ToastEl = <div className={`toast${show ? " show" : ""}`}>{msg}</div>;

  return { showToast, ToastEl };
}
