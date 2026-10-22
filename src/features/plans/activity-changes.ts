import { flattenBlocks, type PortablePlan } from "@/lib/schema/plan";
import { statusLabels, priorityLabels } from "@/lib/labels";

type Change = {
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
};
const name = (value: string | undefined) => value || "без названия";
const referenceName = (props: { title: string; url: string }) =>
  name(props.title || props.url);

/** Compare committed canonical documents. Messages describe this save, never current live names. */
export function activityChanges(
  previous: PortablePlan,
  next: PortablePlan,
): Change[] {
  const changes: Change[] = [];
  if (previous.title !== next.title)
    changes.push({ type: "PLAN_RENAMED", message: `Название: ${next.title}` });
  for (const task of Object.values(next.tasks)) {
    const old = previous.tasks[task.id];
    const add = (type: string, message: string) =>
      changes.push({ type, message, metadata: { taskId: task.id } });
    if (!old) {
      add("TASK_CREATED", `Создана задача: ${name(task.title)}`);
      continue;
    }
    if (old.title !== task.title)
      add(
        "TASK_RENAMED",
        `Задача переименована: «${name(old.title)}» → «${name(task.title)}»`,
      );
    if (old.status !== task.status)
      add(
        "TASK_STATUS_CHANGED",
        `Статус задачи «${name(task.title)}»: ${statusLabels[task.status]}`,
      );
    if ((old.assignee ?? "") !== (task.assignee ?? ""))
      add(
        "TASK_ASSIGNED",
        `Исполнитель «${name(task.title)}»: ${task.assignee || "не указан"}`,
      );
    if ((old.deadline ?? "") !== (task.deadline ?? ""))
      add(
        "TASK_DEADLINE_CHANGED",
        `Дедлайн задачи «${name(task.title)}»: ${task.deadline?.split("-").reverse().join(".") || "не указан"}`,
      );
    if (old.priority !== task.priority)
      add(
        "TASK_PRIORITY_CHANGED",
        `Приоритет задачи «${name(task.title)}»: ${priorityLabels[task.priority]}`,
      );
    if ((old.description ?? "") !== (task.description ?? ""))
      add(
        "TASK_DESCRIPTION_CHANGED",
        `Изменено описание задачи «${name(task.title)}»`,
      );
  }
  for (const old of Object.values(previous.tasks))
    if (!next.tasks[old.id])
      changes.push({
        type: "TASK_DELETED",
        message: `Удалена задача «${name(old.title)}»`,
        metadata: { taskId: old.id },
      });

  const refs = (plan: PortablePlan) =>
    flattenBlocks(plan.blocks).filter((block) => block.type === "reference");
  const oldRefs = new Map(refs(previous).map((block) => [block.id, block]));
  const newRefs = new Map(refs(next).map((block) => [block.id, block]));
  for (const [id, block] of newRefs) {
    const old = oldRefs.get(id);
    if (!old)
      changes.push({
        type: "REFERENCE_ADDED",
        message: `Референс: ${referenceName(block.props)}`,
        metadata: { blockId: id },
      });
    else {
      const changedFields = (["title", "url", "note"] as const).filter(
        (key) => old.props[key] !== block.props[key],
      );
      if (changedFields.length)
        changes.push({
          type: "REFERENCE_CHANGED",
          message:
            old.props.title !== block.props.title
              ? `Изменён референс: «${referenceName(old.props)}» → «${referenceName(block.props)}»`
              : `Изменён референс «${referenceName(block.props)}»`,
          metadata: { blockId: id, changedFields },
        });
    }
  }
  for (const [id, old] of oldRefs)
    if (!newRefs.has(id))
      changes.push({
        type: "REFERENCE_REMOVED",
        message: `Удалён референс «${referenceName(old.props)}»`,
        metadata: { blockId: id },
      });
  return changes;
}
