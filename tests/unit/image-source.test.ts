import { expect, it } from "vitest";
import { inlineRasterSchema } from "../../src/lib/schema/image-source";
import { parseImport } from "../../src/lib/schema/import";
import { encodeShare, decodeShare } from "../../src/lib/share/codec";
import { readFileSync } from "node:fs";

it("accepts bounded raster bytes and rejects active, temporary, malformed and oversized sources", () => {
  const png = `data:image/png;base64,${readFileSync("public/msu-university-seal.png").toString("base64")}`;
  expect(inlineRasterSchema.safeParse(png).success).toBe(true);
  for (const source of [
    "data:image/svg+xml;base64,PHN2Zz4=",
    "blob:https://example.com/id",
    "data:text/html;base64,PGgxPg==",
    "data:image/png;base64,PHN2Zz4=",
    `data:image/png;base64,${Buffer.alloc(70_000).toString("base64")}`,
  ])
    expect(inlineRasterSchema.safeParse(source).success).toBe(false);
});
it("round trips inline media in existing v1 JSON and immutable snapshots", async () => {
  const source = `data:image/png;base64,${readFileSync("public/msu-university-seal.png").toString("base64")}`;
  const plan = parseImport(
    JSON.stringify({
      schemaVersion: 1,
      title: "Медиа",
      tasks: {},
      blocks: [
        {
          id: "image",
          type: "image",
          props: { url: source, caption: "Переносимое изображение" },
        },
      ],
    }),
  );
  expect(await decodeShare(await encodeShare(plan))).toEqual(plan);
  expect(parseImport(JSON.stringify(plan))).toEqual(plan);
});
