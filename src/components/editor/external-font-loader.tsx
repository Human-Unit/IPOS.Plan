"use client";

import { useEffect } from "react";
import type { FontSource } from "@/lib/schema/plan";

/**
 * Loads public HTTPS font assets in the browser. The plan stores URLs, never
 * font binaries. Hosts must send the appropriate Access-Control-Allow-Origin.
 */
export function ExternalFontLoader({ sources }: { sources: FontSource[] }) {
  useEffect(() => {
    if (!("FontFace" in window)) return;
    let disposed = false;
    const installed: FontFace[] = [];

    void Promise.all(sources.map(async (source) => {
      if (!source.url.startsWith("https://")) return;
      try {
        // JSON.stringify escapes quotation marks inside CSS url("...").
        const face = new FontFace(source.family, `url(${JSON.stringify(source.url)})`, {
          display: "swap",
        });
        await face.load();
        if (!disposed) {
          document.fonts.add(face);
          installed.push(face);
        }
      } catch {
        // The browser uses a fallback for unavailable or CORS-blocked fonts.
      }
    }));

    return () => {
      disposed = true;
      for (const face of installed) document.fonts.delete(face);
    };
  }, [sources]);
  return null;
}
