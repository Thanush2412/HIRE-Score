"use client";
import { useState, useEffect } from "react";

function getCSSVar(name: string): string {
  if (typeof window === "undefined") return "#888";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function useChartColors() {
  const [colors, setColors] = useState({ tick: "#888", border: "#e2e8f0" });

  useEffect(() => {
    function update() {
      // Read the actual resolved color from the DOM — works with oklch, hsl, any format
      const el = document.createElement("div");
      el.className = "text-muted-foreground";
      el.style.position = "absolute";
      el.style.visibility = "hidden";
      document.body.appendChild(el);
      const tick = getComputedStyle(el).color;
      document.body.removeChild(el);

      const el2 = document.createElement("div");
      el2.className = "border-border";
      el2.style.position = "absolute";
      el2.style.visibility = "hidden";
      document.body.appendChild(el2);
      const border = getComputedStyle(el2).borderTopColor;
      document.body.removeChild(el2);

      setColors({ tick, border });
    }

    update();
    // Re-read when dark class toggles
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
