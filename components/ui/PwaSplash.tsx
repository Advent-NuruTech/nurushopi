"use client";

import { useEffect, useState } from "react";

const canUseDOM = typeof window !== "undefined";

const isStandaloneDisplay = () =>
  canUseDOM &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

export default function PwaSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isStandaloneDisplay()) return;
    setVisible(true);

    const hide = () => {
      window.setTimeout(() => setVisible(false), 700);
    };

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide, { once: true });
    }

    return () => {
      window.removeEventListener("load", hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0b1f4b] text-white transition-opacity"
      aria-hidden="true"
    >
      <img
        src="/icons/icon-192.png"
        alt=""
        className="h-36 w-36 rounded-[28px] object-contain shadow-xl"
      />
      <div className="absolute bottom-8 text-center text-xs tracking-wide text-white/70">
        from Advent
      </div>
    </div>
  );
}
