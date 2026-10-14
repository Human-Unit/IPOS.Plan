"use client";
import { useMemo, useState } from "react";
import {
  Heading,
  CheckSquare,
  Link2,
  ImageIcon,
  Info,
  Minus,
  FileText,
  ChevronDown,
  ChevronRight,
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

type TaskBlock = Extract<Block, { type: "task" }>;
const childTypes = new Set(["heading", "reference", "image", "callout"]);

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
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const structure = useMemo(() => {
    const loose: Block[] = [];
    const groups: { task: TaskBlock; children: Block[] }[] = [];
    let current: { task: TaskBlock; children: Block[] } | undefined;

    for (const block of flattenBlocks(blocks)) {
      if (block.type === "task") {
        current = { task: block, children: [] };
        groups.push(current);
        continue;
      }

      if (!childTypes.has(block.type)) continue;
      if (current) current.children.push(block);
      else if (block.type === "heading") loose.push(block);
    }

    return { loose, groups };
  }, [blocks]);

  const labelFor = (block: Block) => {
    const item = insertItems.find((i) => i.type === block.type);
    if (block.type === "task")
      return plan.tasks[block.props.taskId]?.title || "Без названия";
    if (block.type === "reference") return block.props.title || "Референс";
    if (block.type === "image") return block.props.caption || "Изображение";
    return blockText(block) || item?.title || "Блок";
  };

  const toggle = (id: string) =>
    setCollapsed((value) => {
      const next = new Set(value);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="plan-outline">
      <p className="panel-eyebrow">СТРУКТУРА ПЛАНА</p>
      <nav aria-label="Структура документа">
        <button className="outline-item cover-item" onClick={() => select()}>
          <FileText size={16} aria-hidden="true" />
          <span>Обложка</span>
        </button>

        {structure.loose.map((block) => (
          <button
            key={block.id}
            className="outline-item outline-loose"
            aria-current={selectedId === block.id ? "location" : undefined}
            onClick={() => select(block.id)}
          >
            <Heading size={15} aria-hidden="true" />
            <span>{labelFor(block)}</span>
          </button>
        ))}

        {structure.groups.map(({ task, children }, index) => {
          const taskId = task.id || task.props.taskId;
          const isCollapsed = collapsed.has(taskId);
          return (
            <div className="outline-group" key={taskId}>
              <div className="outline-task-row">
                {children.length > 0 ? (
                  <button
                    className="outline-disclosure"
                    aria-label={isCollapsed ? "Развернуть задачу" : "Свернуть задачу"}
                    aria-expanded={!isCollapsed}
                    onClick={() => toggle(taskId)}
                  >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>
                ) : (
                  <span className="outline-disclosure-spacer" />
                )}
                <button
                  className="outline-item outline-task"
                  aria-current={selectedId === task.id ? "location" : undefined}
                  onClick={() => select(task.id)}
                >
                  <span className="outline-number">{String(index + 1).padStart(2, "0")}</span>
                  <span>{labelFor(task)}</span>
                </button>
              </div>

              {!isCollapsed && children.length > 0 && (
                <div className="outline-children">
                  {children.map((block) => {
                    const item = insertItems.find((i) => i.type === block.type);
                    const Icon = item?.icon ?? Heading;
                    return (
                      <button
                        key={block.id}
                        className="outline-item outline-child"
                        aria-current={selectedId === block.id ? "location" : undefined}
                        onClick={() => select(block.id)}
                      >
                        <Icon size={13} aria-hidden="true" />
                        <span>{labelFor(block)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
