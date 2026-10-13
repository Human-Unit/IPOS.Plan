"use client";
import {
  Heading,
  CheckSquare,
  Link2,
  ImageIcon,
  Info,
  Minus,
  FileText,
} from "lucide-react";
import type { Block, PortablePlan } from "@/lib/schema/plan";
import { flattenBlocks } from "@/lib/schema/plan";
import { blockText } from "./document-structure";
import { Button } from "@/components/ui/button";

export const insertItems = [
  { title: "Заголовок", type: "heading", icon: Heading },
  { title: "Задача", type: "task", icon: CheckSquare },
  { title: "Референс", type: "reference", icon: Link2 },
  { title: "Изображение", type: "image", icon: ImageIcon },
  { title: "Заметка", type: "callout", icon: Info },
  { title: "Разделитель", type: "divider", icon: Minus },
] as const;
export type InsertType = (typeof insertItems)[number]["type"];

export function PlanOutline({
  plan,
  blocks,
  selectedId,
  select,
  add,
  watermark,
  setWatermark,
}: {
  plan: PortablePlan;
  blocks: Block[];
  selectedId?: string;
  select: (id?: string) => void;
  add: (type: InsertType) => void;
  watermark: boolean;
  setWatermark: (value: boolean) => void;
}) {
  let number = 0;
  return (
    <div className="plan-outline">
      <p className="panel-eyebrow">СТРУКТУРА ПЛАНА</p>
      <nav aria-label="Структура документа">
        <button className="outline-item cover-item" onClick={() => select()}>
          <FileText size={16} aria-hidden="true" />
          <span>Обложка</span>
        </button>
        {flattenBlocks(blocks)
          .filter((b) =>
            ["heading", "task", "reference", "image", "callout"].includes(
              b.type,
            ),
          )
          .map((block) => {
            const item = insertItems.find((i) => i.type === block.type)!;
            const label =
              block.type === "task"
                ? plan.tasks[block.props.taskId]?.title || "Без названия"
                : block.type === "reference"
                  ? block.props.title || "Референс"
                  : block.type === "image"
                    ? block.props.caption || "Изображение"
                    : blockText(block) || item.title;
            return (
              <button
                key={block.id}
                className="outline-item"
                aria-current={selectedId === block.id ? "location" : undefined}
                onClick={() => select(block.id)}
              >
                {block.type === "task" ? (
                  <span className="outline-number">{++number}</span>
                ) : (
                  <item.icon size={15} aria-hidden="true" />
                )}
                <span>{label}</span>
              </button>
            );
          })}
      </nav>
      <div className="quick-insert">
        <p className="panel-eyebrow">ДОБАВИТЬ БЛОК</p>
        {insertItems.map((item) => (
          <Button
            key={item.type}
            variant="ghost"
            size="sm"
            onClick={() => add(item.type)}
          >
            <item.icon size={16} />
            {item.title}
          </Button>
        ))}
      </div>
      <p className="outline-tip">Введите / в документе для вставки блока.</p>
      <label className="watermark-toggle">
        <input
          type="checkbox"
          checked={watermark}
          onChange={(e) => setWatermark(e.target.checked)}
        />
        Водяной знак
      </label>
    </div>
  );
}
