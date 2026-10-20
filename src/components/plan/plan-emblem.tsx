import Image from "next/image";

type PlanEmblemProps = {
  size: number;
  alt?: string;
  className?: string;
};

/** Official MSU seal used only in the plan editor's visual identity. */
export function PlanEmblem({
  size,
  alt = "",
  className = "",
}: PlanEmblemProps) {
  return (
    <Image
      src="/msu-university-seal.png"
      width={size}
      height={size}
      alt={alt}
      className={`plan-emblem ${className}`.trim()}
    />
  );
}
