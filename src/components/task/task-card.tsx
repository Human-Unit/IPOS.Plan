"use client";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Copy,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Plus,
  Trash2,
  Paperclip,
  UserRound,
  CalendarDays,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlanContext } from "@/components/editor/plan-context";
import { SelectableBlock } from "@/components/editor/selectable-block";
import { statusLabels, priorityLabels } from "@/lib/labels";
import { statuses, type Task } from "@/lib/schema/task";
import { flattenBlocks } from "@/lib/schema/plan";
import { deadlineInfo } from "@/features/plans/productivity";
import { useLocalDate } from "@/features/plans/use-local-date";
import { confirmedAssignment } from "@/features/activists/task-assignments";
import { AssignedPeople } from "@/features/activists/assigned-people";

export function TaskCard({
  taskId,
  blockId,
}: {
  taskId: string;
  blockId: string;
}) {
  const context = usePlanContext();
  const today = useLocalDate();
  const {
    plan,
    editable,
    updateTask,
    selectBlock,
    collapsedIds,
    toggleBrief,
    addToBrief,
  } = context;
  const task = plan.tasks[taskId];
  if (!task) return <p role="alert">Задача недоступна: {taskId}</p>;
  const collapsed = editable && Boolean(collapsedIds?.has(blockId));
  const deadline = deadlineInfo(task, today);
  const assignment = editable ? confirmedAssignment(plan, task.id) : undefined;
  const number =
    context.taskOrder?.get(blockId) ??
    flattenBlocks(plan.blocks)
      .filter((block) => block.type === "task")
      .findIndex((block) => block.id === blockId) + 1;
  const change = (patch: Partial<Task>) => updateTask?.({ ...task, ...patch });
  const kind = task.title.match(
    /^(Рилс|Reels|Пост|Карусель|Stories|Сторис|Дизайн|Фотография|Интервью)\s*[—–:-]/i,
  )?.[1];
  return (
    <SelectableBlock
      id={blockId}
      label={`Задача: ${task.title}`}
      className="task-brief"
      openPropertiesOnSelect={false}
    >
      <div className="brief-heading" data-collapsed={collapsed || undefined}>
        <span className="brief-number" aria-hidden="true">
          {String(number).padStart(2, "0")}
        </span>
        <div className="brief-title-group">
          {kind && <span className="brief-kind">{kind}</span>}
          <h3 aria-label={task.title}>
            {editable ? (
              <>
                <textarea
                  rows={1}
                  className="task-title-input"
                  aria-label={`Название: ${task.title}`}
                  maxLength={500}
                  value={task.title}
                  onChange={(event) => change({ title: event.target.value })}
                />
                <span className="print-task-title">{task.title}</span>
              </>
            ) : (
              <span>{task.title || "Без названия"}</span>
            )}
          </h3>
          {editable ? (
            <>
              <select
                className="task-status"
                data-status={task.status}
                aria-label={`Статус задачи: ${task.title}`}
                value={task.status}
                onChange={(event) =>
                  change({ status: event.target.value as Task["status"] })
                }
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
              <span
                className="task-status print-task-status"
                data-status={task.status}
              >
                {statusLabels[task.status]}
              </span>
            </>
          ) : (
            <Badge
              variant="secondary"
              className="task-status"
              data-status={task.status}
            >
              {statusLabels[task.status]}
            </Badge>
          )}
        </div>
        {editable && (
          <div className="brief-quick-controls">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${collapsed ? "Развернуть" : "Свернуть"} задачу: ${task.title}`}
              aria-expanded={!collapsed}
              onClick={() => toggleBrief?.(blockId)}
            >
              {collapsed ? <ChevronDown /> : <ChevronUp />}
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Действия задачи: ${task.title}`}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="plan-actions-menu"
                  align="end"
                  sideOffset={5}
                >
                  <DropdownMenu.Group>
                    <DropdownMenu.Item onSelect={() => selectBlock?.(blockId)}>
                      <SlidersHorizontal />
                      Свойства задачи
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => context.duplicateBrief?.(blockId)}
                    >
                      <Copy />
                      Дублировать задачу
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => context.saveTemplate?.(blockId)}
                    >
                      <Copy />
                      Сохранить как шаблон
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      disabled={number <= 1}
                      onSelect={() => context.moveBrief?.(blockId, "up")}
                    >
                      <ArrowUp />
                      Переместить выше
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      disabled={
                        number >=
                        flattenBlocks(plan.blocks).filter(
                          (block) => block.type === "task",
                        ).length
                      }
                      onSelect={() => context.moveBrief?.(blockId, "down")}
                    >
                      <ArrowDown />
                      Переместить ниже
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => context.removeBrief?.(blockId)}
                    >
                      <Trash2 />
                      Удалить задачу
                    </DropdownMenu.Item>
                  </DropdownMenu.Group>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        )}
      </div>
      {
        <div className="brief-body" data-collapsed={collapsed || undefined}>
          {editable ? (
            <>
              <textarea
                className="task-description-input"
                aria-label={`Описание задачи: ${task.title}`}
                placeholder="Что нужно создать? Опишите идею и результат…"
                maxLength={10000}
                rows={1}
                value={task.description ?? ""}
                onChange={(event) =>
                  change({ description: event.target.value || undefined })
                }
              />
              <p className="print-task-description">{task.description}</p>
            </>
          ) : task.description ? (
            <p className="brief-description-text">{task.description}</p>
          ) : null}
          <dl className="brief-facts">
            <div className="brief-fact-deadline" data-deadline={editable ? deadline.kind : undefined}>
              <dt><CalendarDays className="brief-fact-icon" size={15} aria-hidden="true" />Дедлайн</dt>
              <dd>
                {task.deadline ? <time dateTime={task.deadline}>{task.deadline.split("-").reverse().join(".")}</time> : "Не указан"}
                {editable && deadline.days !== undefined && <small className="deadline-hint">{deadline.label}</small>}
              </dd>
            </div>
            <div>
              <dt><UserRound className="brief-fact-icon" size={15} aria-hidden="true" />Ответственные</dt>
              <dd>{assignment ? <AssignedPeople assignment={assignment} text={task.assignee || ""} openPerson={context.openPerson} /> : task.assignee || "Не назначены"}</dd>
            </div>
            <div className="brief-priority">
              <dt>Приоритет</dt>
              <dd>{priorityLabels[task.priority]}</dd>
            </div>
          </dl>
          {editable && (
            <div
              className="brief-insert"
              aria-label={`Добавить к задаче: ${task.title}`}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addToBrief?.(blockId, "requirement")}
              >
                <Plus data-icon="inline-start" />
                Требование
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addToBrief?.(blockId, "reference")}
              >
                <Plus data-icon="inline-start" />
                Референс
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addToBrief?.(blockId, "image")}
              >
                <Plus data-icon="inline-start" />
                Изображение
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addToBrief?.(blockId, "file")}
              >
                <Paperclip data-icon="inline-start" />
                Файл
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  // ProseMirror can focus its text surface during a click in
                  // this custom block. Keep the actual drawer opener focused
                  // so closing properties returns here without moving selection.
                  event.currentTarget.focus({ preventScroll: true });
                  selectBlock?.(blockId);
                }}
                aria-label={`Свойства задачи: ${task.title}`}
              >
                <SlidersHorizontal />
              </Button>
            </div>
          )}
        </div>
      }
    </SelectableBlock>
  );
}
