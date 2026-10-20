import Image from "next/image";
import type { CSSProperties } from "react";

// Preserve the exported SVGs and their natural viewport; scale their wrapper.
const assets = {
  emblem: {
    src: "/brand/student-council-emblem.svg",
    width: 340,
    height: 421.4,
  },
  lockup: {
    src: "/brand/student-council-lockup.svg",
    width: 1915.36,
    height: 474.287,
  },
};
export function OfficialBrand({
  kind = "emblem",
  width = 44,
  decorative = false,
  className = "",
}: {
  kind?: keyof typeof assets;
  width?: number;
  decorative?: boolean;
  className?: string;
}) {
  const asset = assets[kind];
  return (
    <span
      className={`official-brand ${className}`}
      style={
        {
          width,
          height: (width * asset.height) / asset.width,
          "--brand-scale": width / asset.width,
        } as CSSProperties
      }
      aria-hidden={decorative || undefined}
    >
      <Image
        unoptimized
        src={asset.src}
        width={Math.round(asset.width)}
        height={Math.round(asset.height)}
        style={{ width: asset.width, height: "auto" }}
        loading="eager"
        alt={decorative ? "" : "Студенческий совет"}
        className="official-brand-image"
      />
    </span>
  );
}
