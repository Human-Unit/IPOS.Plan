import Image from "next/image";
import type { PortablePlan } from "@/lib/schema/plan";
import { flattenBlocks } from "@/lib/schema/plan";
import { Textarea } from "@/components/ui/textarea";

export function PlanCover({
  plan,
  editable,
  onTitleChange,
}: {
  plan: PortablePlan;
  editable: boolean;
  onTitleChange?: (title: string) => void;
}) {
  const taskIds = new Set(
    flattenBlocks(plan.blocks)
      .filter((b) => b.type === "task")
      .map((b) => b.props.taskId),
  );
  const done = [...taskIds].filter(
    (id) => plan.tasks[id]?.status === "done",
  ).length;
  return (
    <header className="plan-cover" id="plan-cover">
      <Image src="/icon.svg" width={56} height={56} alt="IPOS Plan" />
      <div>
        <p className="cover-eyebrow">IPOS · ПЛАН</p>
        {editable ? (
          <Textarea
            aria-label="Название плана"
            maxLength={500}
            rows={2}
            value={plan.title}
            onChange={(e) => onTitleChange?.(e.target.value)}
            className="cover-title"
          />
        ) : (
          <h1>{plan.title || "Без названия"}</h1>
        )}
        <p className="cover-meta">
          Задач: {taskIds.size} · Готово: {done}
        </p>
      </div>
    </header>
  );
}
