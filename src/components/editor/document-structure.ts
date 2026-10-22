import type { Block } from "@/lib/schema/plan";

// Presentation only: keep every block and its ID in the original document.
export function taskCompanions(blocks: Block[]) {
  const companions: Record<string, Block[]> = {};
  const embeddedIds = new Set<string>();
  const sectionById: Record<string, string> = {};
  const endIds = new Set<string>();
  const walk = (siblings: Block[]) => {
    siblings.forEach((block, index) => {
      if (block.type === "task" && block.id) {
        const members: Block[] = [];
        for (const next of siblings.slice(index + 1)) {
          if (next.type === "task" || next.type === "divider") break;
          members.push(next);
        }
        companions[block.id] = members;
        sectionById[block.id] = block.id;
        members.forEach((item) => {
          if (!item.id) return;
          sectionById[item.id] = block.id!;
          if (
            (item.type === "reference" || item.type === "image") &&
            (!item.children || item.children.length === 0)
          )
            embeddedIds.add(item.id);
        });
        const last = [block, ...members]
          .filter((item) => !item.id || !embeddedIds.has(item.id))
          .at(-1);
        if (last?.id) endIds.add(last.id);
      }
      walk(block.children ?? []);
    });
  };
  walk(blocks);
  return { companions, embeddedIds, sectionById, endIds };
}

export function duplicateTitleHeading(blocks: Block[], title: string) {
  const normalize = (text: string) =>
    text
      .toLocaleLowerCase("ru")
      .replace(/^контент[- ]план\s*[—–:-]\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
  const first = blocks.find(
    (block) => block.type !== "paragraph" || blockText(block).trim(),
  );
  return first?.type === "heading" &&
    normalize(blockText(first)) === normalize(title)
    ? first.id
    : undefined;
}

export function planSummary(plan: import("@/lib/schema/plan").PortablePlan) {
  const ids = new Set(referencedTaskIds(plan.blocks));
  const tasks = [...ids].map((id) => plan.tasks[id]).filter(Boolean);
  const source = [
    plan.title,
    ...tasks.map((task) => task.description ?? ""),
    ...allBlockText(plan.blocks),
  ].join("\n");
  return {
    total: ids.size,
    done: tasks.filter((task) => task.status === "done").length,
    contact: source.match(/(?:^|\s)(@[a-zA-Z][a-zA-Z0-9_]{3,31})\b/)?.[1],
    date: plan.title.match(/\b\d{2}\.\d{2}\.\d{4}\b/)?.[0],
  };
}
function referencedTaskIds(blocks: Block[]): string[] {
  return blocks.flatMap((block) => [
    ...(block.type === "task" ? [block.props.taskId] : []),
    ...referencedTaskIds(block.children ?? []),
  ]);
}
function allBlockText(blocks: Block[]): string[] {
  return blocks.flatMap((block) => [
    block.type === "reference" ? block.props.note : blockText(block),
    ...allBlockText(block.children ?? []),
  ]);
}

export function blockText(block: Block): string {
  return ("content" in block ? (block.content ?? []) : [])
    .map((part) =>
      part.type === "text"
        ? part.text
        : part.content.map((text) => text.text).join(""),
    )
    .join("");
}
