import { describe, expect, it } from "vitest";
import { buildPlanDocx } from "@/features/export/docx";
import { demoPlan } from "@/features/plans/demo";
import { makeZip } from "@/features/export/zip";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
function localEntries(data: Uint8Array): Record<string, Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const found: Record<string, Uint8Array> = {};
  let offset = 0;
  while (offset + 30 <= data.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameSize = view.getUint16(offset + 26, true);
    const extra = view.getUint16(offset + 28, true);
    const name = decoder.decode(data.subarray(offset + 30, offset + 30 + nameSize));
    const start = offset + 30 + nameSize + extra;
    found[name] = data.subarray(start, start + size);
    offset = start + size;
  }
  return found;
}
describe("editable Word export", () => {
  it("creates valid OOXML parts and ZIP structure", () => {
    const doc = buildPlanDocx(demoPlan);
    const items = localEntries(doc.bytes);
    expect([...doc.bytes.slice(0, 4)]).toEqual([80, 75, 3, 4]);
    expect(items["word/document.xml"]).toBeDefined();
    expect(items["word/styles.xml"]).toBeDefined();
    expect(items["word/header1.xml"]).toBeDefined();
    expect(items["[Content_Types].xml"]).toBeDefined();
    const body = decoder.decode(items["word/document.xml"]);
    expect(body).toContain("Контент-план для сектора СМИ");
    expect(body).toContain('<w:pgSz w:w="11906" w:h="16838"/>');
    expect(body).toContain("Описание – ");
    expect(body).toContain("Ответственное лицо – ");
    expect(body).toContain("Вид контента – ");
    expect(body).toContain("Готово"); // demo data is rendered without flattening to an image
  });
  it("retains external Word hyperlinks and optional imagery", () => {
    const image = { bytes: new Uint8Array([137,80,78,71,13,10,26,10]), width: 400, height: 600, type: "image/png" as const };
    const example = { ...demoPlan, blocks: [
      { id: "task-1", type: "task" as const, props: { taskId: "demo-announcement" } },
      { id: "ref-1", type: "reference" as const, props: { url: "https://www.instagram.com/", title: "Референс", note: "" } },
      { id: "img-1", type: "image" as const, props: { url: "https://example.org/frame.png", caption: "Кадр" } },
    ] };
    const data = buildPlanDocx(example, { emblem: image, watermark: image, images: { "img-1": image } });
    const parts = localEntries(data.bytes);
    const rels = decoder.decode(parts["word/_rels/document.xml.rels"]);
    expect(rels).toContain('Target="https://www.instagram.com/"');
    expect(rels).toContain('Target="header1.xml"');
    expect(parts["word/media/export-0.png"]).toBeDefined();
    expect(parts["word/media/watermark-export.png"]).toBeDefined();
    expect(decoder.decode(parts["word/header1.xml"])).toContain("IPOSWatermark");
    expect(data.warnings).toEqual([]);
  });
  it("escapes task content to prevent invalid XML or markup injection", () => {
    const p = { ...demoPlan, title: 'СМИ & <проверка> "всё"',
      tasks: { ...demoPlan.tasks, "demo-announcement": {
        ...demoPlan.tasks["demo-announcement"],
        description: 'Амина & Назри <script> "тест"',
      } },
    };
    const xml = decoder.decode(localEntries(buildPlanDocx(p).bytes)["word/document.xml"]);
    expect(xml).toContain("&amp; &lt;проверка&gt;");
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).not.toContain("<script>");
  });
  it("writes UTF-8 names and bytes correctly in store ZIP mode", () => {
    const zip = makeZip([{ name: "тест.txt", data: encoder.encode("привет") }]);
    expect(decoder.decode(localEntries(zip)["тест.txt"])).toBe("привет");
    expect(new DataView(zip.buffer).getUint32(zip.length - 22, true)).toBe(0x06054b50);
  });
});