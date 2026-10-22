import { projectBriefs, type EditorNode } from "./brief-document";
import { flattenBlocks } from "@/lib/schema/plan";
import type { Block } from "@/lib/schema/plan";

// Navigation metadata is derived from the same containers as the editor.
export function taskCompanions(blocks: Block[]) {
  const companions: Record<string, Block[]> = {};
  const sectionById: Record<string, string> = {};
  const embeddedIds = new Set<string>();
  const endIds = new Set<string>();
  const sources = new Map(
    flattenBlocks(blocks)
      .filter((block) => block.id)
      .map((block) => [block.id!, block]),
  );
  const walk = (nodes: EditorNode[], owner?: string) => {
    for (const node of nodes) {
      if (node.type === "brief" && node.id) {
        companions[node.id] = [];
        sectionById[node.id] = node.id;
        walk(node.children ?? [], node.id);
        continue;
      }
      if (node.type === "briefChildren" || node.type === "mediaStrip") {
        walk(node.children ?? [], owner);
        continue;
      }
      const source = node.id ? sources.get(node.id) : undefined;
      if (owner && source?.id) {
        companions[owner].push(source);
        sectionById[source.id] = owner;
        if (
          ["reference", "image"].includes(source.type) &&
          !source.children?.length
        )
          embeddedIds.add(source.id);
      }
      walk(node.children ?? [], owner);
    }
  };
  walk(projectBriefs(blocks));
  for (const [id, members] of Object.entries(companions)) {
    const last = members
      .filter((block) => block.id && !embeddedIds.has(block.id))
      .at(-1);
    endIds.add(last?.id ?? id);
  }
  return { companions, sectionById, embeddedIds, endIds };
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
