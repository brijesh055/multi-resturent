import { useEffect } from "react";

// Safe window check — never crashes during Vercel SSR build
const isBrowser = typeof window !== "undefined";

export default function useCursor() {
  useEffect(() => {
    if (!isBrowser) return;

    const hasMouse = window.matchMedia("(pointer: fine)").matches;
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 1;
    if (!hasMouse || hasTouch) return;

    document.body.classList.add("has-mouse");
    const dot  = document.querySelector(".cur-dot");
    const ring = document.querySelector(".cur-ring");
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0, raf;

    const onMove = e => {
      mouseX = e.clientX; mouseY = e.clientY;
      dot.style.left = mouseX + "px";
      dot.style.top  = mouseY + "px";
    };
    const animate = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + "px";
      ring.style.top  = ringY + "px";
      raf = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", () => { dot.style.opacity = "0"; ring.style.opacity = "0"; });
    document.addEventListener("mouseenter", () => { dot.style.opacity = "1"; ring.style.opacity = "1"; });
    raf = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      document.body.classList.remove("has-mouse");
    };
  }, []);
}
