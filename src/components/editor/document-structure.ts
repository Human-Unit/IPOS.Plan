import type { Block } from "@/lib/schema/plan";

// Presentation only: keep every block and its ID in the original document.
// A task can visually own reference/image blocks that appear later in the same
// brief, even when requirements or notes sit between them. Persisted JSON stays
// untouched; we only suppress companion media at its original position.
export function taskCompanions(blocks: Block[]) {
  const companions: Record<string, Block[]> = {};
  const embeddedIds = new Set<string>();

  const walk = (siblings: Block[]) => {
    siblings.forEach((block, index) => {
      if (block.type === "task" && block.id) {
        const media: Block[] = [];

        for (const next of siblings.slice(index + 1)) {
          if (next.type === "task" || next.type === "divider") break;
          // A standalone paragraph/quote or another chapter heading starts a
          // new section. Requirements and list items still belong to the task.
          if (next.type === "paragraph" || next.type === "quote") break;
          if (next.type === "heading" &&
              !/^(требования|референсы|requirements|references)/i.test(blockText(next).trim())) break;
          // Never reparent blocks with children: hiding them would lose content.
          if ((next.type === "reference" || next.type === "image") &&
              (!next.children || next.children.length === 0)) media.push(next);
        }

        companions[block.id] = media;
        media.forEach((item) => {
          if (item.id) embeddedIds.add(item.id);
        });
      }

      walk(block.children ?? []);
    });
  };

  walk(blocks);
  return { companions, embeddedIds };
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

// Visual-only grouping for the production brief canvas. BlockNote blocks must
// stay at their original document positions for editing, undo and JSON export.
// Return only root-level, actually visible IDs; embedded media is already
// presented inside its task and must not become a fake section boundary.
export function taskVisualGroups(blocks: Block[], embeddedIds: Set<string>) {
  const groups: string[][] = [];
  let active: string[] | undefined;

  for (const block of blocks) {
    if (block.type === "task") {
      active = [];
      groups.push(active);
    } else if (
      block.type === "divider" ||
      (block.type === "heading" && block.props.level <= 2)
    ) {
      active = undefined;
    }

    if (active && block.id && !embeddedIds.has(block.id) &&
        block.type !== "divider") {
      active.push(block.id);
    }
  }

  return groups.filter((group) => group.length > 0);
}
