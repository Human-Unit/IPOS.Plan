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
          if (next.type === "reference" || next.type === "image") media.push(next);
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
