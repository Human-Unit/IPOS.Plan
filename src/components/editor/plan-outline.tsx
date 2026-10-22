"use client";
import { useState } from "react";
import {
  Heading,
  CheckSquare,
  Link2,
  ImageIcon,
  Info,
  Minus,
  FileText,
  ChevronDown,
  Plus,
} from "lucide-react";
import type { Block, PortablePlan } from "@/lib/schema/plan";
import { flattenBlocks } from "@/lib/schema/plan";
import {
  blockText,
  taskCompanions,
  duplicateTitleHeading,
} from "./document-structure";
import { Button } from "@/components/ui/button";
import { statusLabels } from "@/lib/labels";

export const insertItems = [
  { title: "Задача", type: "task", icon: CheckSquare },
  { title: "Заголовок", type: "heading", icon: Heading },
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
}: {
  plan: PortablePlan;
  blocks: Block[];
  selectedId?: string;
  select: (id?: string) => void;
  add: (type: InsertType) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const { companions, sectionById } = taskCompanions(blocks);
  const duplicateId = duplicateTitleHeading(blocks, plan.title);
  const visible = flattenBlocks(blocks).filter(
    (block) =>
      insertItems.some((item) => item.type === block.type) &&
      block.type !== "divider",
  );
  const label = (block: Block) =>
    block.id === duplicateId
      ? "Заголовок документа"
      : block.type === "task"
        ? plan.tasks[block.props.taskId]?.title || "Без названия"
        : block.type === "reference"
          ? block.props.title || "Референс"
          : block.type === "image"
            ? block.props.caption || "Изображение"
            : blockText(block) ||
              insertItems.find((item) => item.type === block.type)?.title ||
              "Блок";
  const row = (block: Block, child = false) => {
    const Icon = insertItems.find((item) => item.type === block.type)!.icon;
    return (
      <button
        key={block.id}
        className={`outline-item${child ? " outline-child" : ""}`}
        aria-current={selectedId === block.id ? "location" : undefined}
        title={label(block)}
        onClick={() => select(block.id)}
      >
        <Icon size={child ? 12 : 15} aria-hidden="true" />
        <span>{label(block)}</span>
      </button>
    );
  };
  let number = 0;
  return (
    <div className="plan-outline">
      <p className="panel-eyebrow">Структура</p>
      <nav aria-label="Структура документа">
        <button
          className="outline-item cover-item"
          onClick={() => select()}
          aria-current={!selectedId ? "location" : undefined}
        >
          <FileText size={16} aria-hidden="true" />
          <span>Обложка</span>
        </button>
        {visible
          .filter((block) => block.type === "task" || !sectionById[block.id!])
          .map((block) => {
            if (block.type !== "task") return row(block);
            const children = visible.filter(
              (item) =>
                item.id !== block.id &&
                companions[block.id!]?.some((member) => member.id === item.id),
            );
            const closed = collapsed.has(block.id!);
            const active =
              selectedId === block.id ||
              Boolean(selectedId && sectionById[selectedId] === block.id);
            return (
              <div className="outline-task" key={block.id}>
                <div className="outline-task-row">
                  <button
                    className="outline-item outline-task-title"
                    title={label(block)}
                    aria-current={active ? "location" : undefined}
                    onClick={() => select(block.id)}
                  >
                    <span className="outline-number">
                      {String(++number).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="outline-name">{label(block)}</span>
                      <small className="outline-task-status">
                        {
                          statusLabels[
                            plan.tasks[block.props.taskId]?.status ?? "todo"
                          ]
                        }
                      </small>
                    </span>
                  </button>
                  {children.length > 0 && (
                    <button
                      className="outline-collapse"
                      aria-label={`${closed ? "Развернуть" : "Свернуть"} ${label(block)}`}
                      aria-expanded={!closed}
                      aria-controls={closed ? undefined : `outline-${block.id}`}
                      onClick={() =>
                        setCollapsed((previous) => {
                          const next = new Set(previous);
                          if (next.has(block.id!)) next.delete(block.id!);
                          else next.add(block.id!);
                          return next;
                        })
                      }
                    >
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {children.length > 0 && !closed && (
                  <div id={`outline-${block.id}`}>
                    {children.map((item) => row(item, true))}
                  </div>
                )}
              </div>
            );
          })}
      </nav>
      <div className="quick-insert">
        <p className="panel-eyebrow">Добавить блок</p>
        {insertItems.map((item) => (
          <Button
            key={item.type}
            variant="ghost"
            size="sm"
            onClick={() => add(item.type)}
          >
            <Plus data-icon="inline-start" />
            {item.title}
          </Button>
        ))}
      </div>
      <p className="outline-tip">/ — вставка блока в документ</p>
    </div>
  );
}
