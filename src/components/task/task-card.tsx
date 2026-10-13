"use client";
import { CheckCircle2, Circle, UserRound, CalendarDays } from "lucide-react";
import { useId } from "react";
import { usePlanContext } from "@/components/editor/plan-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { statuses, priorities, type Task } from "@/lib/schema/task";
import { statusLabels, priorityLabels } from "@/lib/labels";
export function TaskCard({ taskId }: { taskId: string }) {
  const fieldId = useId();
  const { plan, editable, updateTask } = usePlanContext();
  const task = plan.tasks[taskId];
  if (!task) return <p role="alert">Задача недоступна: {taskId}</p>;
  const change = (patch: Partial<Task>) => updateTask?.({ ...task, ...patch });
  const Icon = task.status === "done" ? CheckCircle2 : Circle;
  return (
    <section
      className="task-block"
      contentEditable={false}
      aria-label={`Задача: ${task.title}`}
    >
      <div className="task-heading">
        <Icon className="task-icon" aria-hidden="true" />
        {editable ? (
          <Input
            aria-label="Название задачи"
            maxLength={500}
            value={task.title}
            onChange={(e) => change({ title: e.target.value })}
          />
        ) : (
          <h3>{task.title || "Без названия"}</h3>
        )}
        <Badge variant="secondary">{statusLabels[task.status]}</Badge>
      </div>
      {editable ? (
        <FieldGroup className="task-fields">
          <Field>
            <FieldLabel htmlFor={`${fieldId}-assignee`}>Исполнитель</FieldLabel>
            <Input
              id={`${fieldId}-assignee`}
              placeholder="Не назначен"
              maxLength={200}
              value={task.assignee ?? ""}
              onChange={(e) =>
                change({ assignee: e.target.value || undefined })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-deadline`}>Срок</FieldLabel>
            <Input
              id={`${fieldId}-deadline`}
              type="date"
              value={task.deadline ?? ""}
              onChange={(e) =>
                change({ deadline: e.target.value || undefined })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-status`}>Статус</FieldLabel>
            <select
              id={`${fieldId}-status`}
              value={task.status}
              onChange={(e) =>
                change({ status: e.target.value as Task["status"] })
              }
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-priority`}>Приоритет</FieldLabel>
            <select
              id={`${fieldId}-priority`}
              value={task.priority}
              onChange={(e) =>
                change({ priority: e.target.value as Task["priority"] })
              }
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field className="task-description">
            <FieldLabel htmlFor={`${fieldId}-description`}>Описание</FieldLabel>
            <Textarea
              id={`${fieldId}-description`}
              placeholder="Детали задачи"
              maxLength={10000}
              value={task.description ?? ""}
              onChange={(e) =>
                change({ description: e.target.value || undefined })
              }
            />
          </Field>
        </FieldGroup>
      ) : (
        <>
          <div className="task-meta">
            <span>
              <UserRound aria-hidden="true" />
              {task.assignee || "Не назначен"}
            </span>
            <span>
              <CalendarDays aria-hidden="true" />
              {task.deadline
                ? new Intl.DateTimeFormat("ru-RU", {
                    dateStyle: "medium",
                  }).format(new Date(`${task.deadline}T12:00:00`))
                : "Без срока"}
            </span>
            <span>Приоритет: {priorityLabels[task.priority]}</span>
          </div>
          {task.description && (
            <p className="task-detail">{task.description}</p>
          )}
        </>
      )}
    </section>
  );
}
