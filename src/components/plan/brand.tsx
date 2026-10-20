import { PlanEmblem } from "@/components/plan/plan-emblem";
import Link from "next/link";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="IPOS.Plan · Мои планы">
      <span className="brand-mark" aria-hidden="true">
        <PlanEmblem size={32} />
      </span>
      <span className="brand-name">IPOS.Plan</span>
      <span className="brand-description">Медиасектор ИПОС</span>
    </Link>
  );
}
