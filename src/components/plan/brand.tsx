import { PlanEmblem } from "@/components/plan/plan-emblem";
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <PlanEmblem size={32} />
      </span>
      <span>
        IPOS<span className="brand-divider">/</span>
        <span className="brand-description">Контент-планы</span>
      </span>
    </div>
  );
}
