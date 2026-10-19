import type { Block, BlockTypography, Inline, PortablePlan } from "@/lib/schema/plan";
import { makeZip, type ZipEntry } from "./zip";

const encoder = new TextEncoder();
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

export type DocxImage = {
  bytes: Uint8Array;
  type: "image/png" | "image/jpeg";
  width: number;
  height: number;
};
export type ExportResources = {
  emblem?: DocxImage;
  watermark?: DocxImage;
  images?: Record<string, DocxImage>;
};
export type DocxExport = { bytes: Uint8Array; warnings: string[] };

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const attr = (s: string) => xml(s);
const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const plain = (list: Inline | undefined) => (list ?? []).map((part) => part.type === "text" ? part.text : part.content.map((x) => x.text).join("")).join("");
const hexColor = (v: string | undefined, fallback: string) => v && /^#?[0-9a-fA-F]{6}$/.test(v) ? v.replace("#", "").toUpperCase() : fallback;
const bytes = (s: string) => encoder.encode(s);
type RunOptions = { bold?: boolean; italic?: boolean; underline?: boolean; color?: string; size?: number; family?: string; strike?: boolean };
type ParagraphOptions = { before?: number; after?: number; keepNext?: boolean; noSplit?: boolean; align?: "left" | "center" | "right" | "both"; indent?: number; border?: boolean };

function run(s: string, o: RunOptions = {}): string {
  const fonts = o.family ? '<w:rFonts w:ascii="' + attr(o.family) + '" w:hAnsi="' + attr(o.family) + '" w:cs="' + attr(o.family) + '"/>' : "";
  const props = fonts + (o.bold ? "<w:b/>" : "") + (o.italic ? "<w:i/>" : "") + (o.underline ? '<w:u w:val="single"/>' : "") + (o.strike ? "<w:strike/>" : "") +
    (o.color ? '<w:color w:val="' + hexColor(o.color, "17191D") + '"/>' : "") +
    (o.size ? '<w:sz w:val="' + Math.max(14, Math.min(96, Math.round(o.size * 2))) + '"/>' : "");
  return "<w:r>" + (props ? "<w:rPr>" + props + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + xml(s) + "</w:t></w:r>";
}
function paragraph(inner: string, o: ParagraphOptions = {}) {
  const spacing = '<w:spacing w:before="' + (o.before ?? 0) + '" w:after="' + (o.after ?? 0) + '" w:line="270" w:lineRule="auto"/>';
  const pPr = spacing + (o.keepNext ? "<w:keepNext/>" : "") + (o.noSplit ? "<w:keepLines/>" : "") +
    (o.align ? '<w:jc w:val="' + o.align + '"/>' : "") + (o.indent ? '<w:ind w:left="' + o.indent + '"/>' : "") +
    (o.border ? '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="3974C8"/></w:pBdr>' : "");
  return "<w:p><w:pPr>" + pPr + "</w:pPr>" + inner + "</w:p>";
}
function styledInline(parts: Inline | undefined, typography?: BlockTypography, defaultSize = 13): string {
  const family = typography?.fontFamily?.replace(/["']/g, "").split(",")[0].trim() || "Arial";
  const size = typography?.fontSize ? typography.fontSize * .75 : defaultSize;
  const forcedBold = typography?.fontWeight ? Number(typography.fontWeight) >= 600 : false;
  return (parts ?? []).map((item) => {
    if (item.type === "text") return run(item.text, {
      family, size, bold: forcedBold || item.styles.bold, italic: item.styles.italic,
      underline: item.styles.underline, strike: item.styles.strike,
      color: item.styles.textColor,
    });
    return run(item.content.map((p) => p.text).join(""), { color: "132FC1", underline: true, family, size });
  }).join("");
}
function imageRun(rid: string, id: number, extentX: number, extentY: number, title: string) {
  const cx = Math.round(extentX), cy = Math.round(extentY);
  return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
    '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + id + '" name="' + attr(title) + '"/>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="' + attr(title) + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
    '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>' +
    '</wp:inline></w:drawing></w:r>';
}
function twoColumn(left: string, right: string, tableWidth = 10100, imageWidth = 2050): string {
  const leftWidth = tableWidth - imageWidth - 160;
  const cell = (content: string, width: number) =>
    '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/><w:vAlign w:val="top"/>' +
    '<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="75" w:type="dxa"/></w:tcMar></w:tcPr>' +
    (content || paragraph("")) + '</w:tc>';
  return '<w:tbl><w:tblPr><w:tblW w:w="' + tableWidth + '" w:type="dxa"/><w:tblLayout w:type="fixed"/>' +
    '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr>' +
    '<w:tblGrid><w:gridCol w:w="' + leftWidth + '"/><w:gridCol w:w="' + (imageWidth + 160) + '"/></w:tblGrid>' +
    '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cell(left, leftWidth) + cell(right, imageWidth + 160) + '</w:tr></w:tbl>';
}

export function buildPlanDocx(plan: PortablePlan, resources: ExportResources = {}): DocxExport {
  const files: ZipEntry[] = [];
  const images: { type: string; id: string; target: string }[] = [];
  const relationships: string[] = [];
  const headerRelationships: string[] = [];
  const warnings: string[] = [];
  let serial = 1;
  let picSerial = 1;
  const addImage = (image: DocxImage | undefined) => {
    if (!image) return undefined;
    const rid = "rId" + serial++;
    const extension = image.type === "image/jpeg" ? "jpg" : "png";
    const target = "media/export-" + images.length + "." + extension;
    images.push({ type: image.type, id: rid, target });
    files.push({ name: "word/" + target, data: image.bytes });
    relationships.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="' + target + '"/>');
    return rid;
  };
  const link = (url: string, title: string, opts: RunOptions = {}) => {
    if (!/^https?:\/\//.test(url)) return run(title, opts);
    const rid = "rId" + serial++;
    relationships.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + attr(url) + '" TargetMode="External"/>');
    return '<w:hyperlink r:id="' + rid + '" w:history="1">' + run(title, { color: "0563C1", underline: true, ...opts }) + '</w:hyperlink>';
  };
  const addBlock = (b: Block): string => {
    const typ = b.id ? plan.typography?.[b.id] : undefined;
    const text = "content" in b ? plain(b.content) : "";
    if (b.type === "divider") return paragraph("", { after: 240, border: true });
    if (b.type === "heading") {
      const level = b.props?.level || 2;
      const sz = typ?.fontSize ? typ.fontSize * .75 : (level === 1 ? 19 : level === 2 ? 15 : 13);
      return paragraph(run(text, { bold: true, size: sz, family: typ?.fontFamily || "Arial" }), { before: 140, after: 90, keepNext: true });
    }
    if (b.type === "paragraph" || b.type === "quote" || b.type === "callout") {
      const sz = b.type === "callout" ? 9 : 13;
      return paragraph(styledInline(b.content, typ, sz), { after: b.type === "callout" ? 70 : 110 });
    }
    if (b.type === "bulletListItem" || b.type === "numberedListItem") {
      return paragraph(run(b.type === "bulletListItem" ? "•   " : "–   ", { size: 13 }) + styledInline(b.content, typ, 13), { after: 35, indent: 220 });
    }
    if (b.type === "reference") {
      return paragraph(link(b.props.url, b.props.title || "Референс", { size: 13 }), { after: 45 });
    }
    if (b.type === "image") {
      const image = b.id ? resources.images?.[b.id] : undefined;
      const rid = addImage(image);
      if (rid && image) {
        const targetWidth = 2000 * 635;
        const targetHeight = Math.min(3200 * 635, targetWidth * (image.height / image.width));
        return paragraph(imageRun(rid, picSerial++, targetWidth, targetHeight, b.props.caption || "Иллюстрация"), { after: 80 });
      }
      if (b.props.url) return paragraph(link(b.props.url, b.props.caption || "Изображение"), { after: 70 });
      return "";
    }
    return "";
  };
  const allBlocks = plan.blocks.filter(Boolean);
  const prelude: Block[] = [];
  const sections: { task: Extract<Block, { type: "task" }>; siblings: Block[] }[] = [];
  let current: { task: Extract<Block, { type: "task" }>; siblings: Block[] } | undefined;
  for (const block of allBlocks) {
    if (block.type === "task") {
      current = { task: block, siblings: [] };
      sections.push(current);
    } else if (current) current.siblings.push(block);
    else prelude.push(block);
  }

  const emblemRid = addImage(resources.emblem);
  const titleLeft = emblemRid ? paragraph(imageRun(emblemRid, picSerial++, 1180 * 635, 1470 * 635, "Эмблема Студсовета")) : "";
  const titleRight = paragraph(run("Контент-план для сектора СМИ (ИПОС)", { bold: true, size: 17.5 }), { after: 30 }) +
    paragraph(run("студенческого совета филиала МГУ", { bold: true, size: 17.5 }), { after: 30 }) +
    paragraph(run("г. Душанбе", { bold: true, size: 17.5 }), { after: 40 });
  let body = twoColumn(titleLeft, titleRight, 10100, 1500) + paragraph("", { before: 270, after: 180, border: true });

  // Preserve non-task introductory information, but never repeat the long
  // cover title already shown in the document heading.
  for (const b of prelude) {
    if (b.type === "heading" && normalize(plain(b.content)).includes("контент-план для сектора сми")) continue;
    body += addBlock(b);
  }

  for (const { task: block, siblings } of sections) {
    const task = plan.tasks[block.props.taskId];
    if (!task) continue;
    const parts = task.title.split(/\s+[-–—]\s+/, 2);
    const kind = parts.length > 1 ? parts[0] : "Материал";
    const topic = parts.length > 1 ? parts[1] : task.title;
    const photos = siblings.filter((b) => b.type === "image");
    const primaryPhoto = photos.find((b) => b.type === "image" && b.id && resources.images?.[b.id]) as Extract<Block, { type: "image" }> | undefined;
    const primary = primaryPhoto?.id ? resources.images?.[primaryPhoto.id] : undefined;
    const imageRid = addImage(primary);
    let info = paragraph(run("Вид контента – " + kind, { bold: true, size: 14.5 }), { after: 60, keepNext: true });
    if (topic && normalize(topic) !== normalize(kind)) {
      info += paragraph(run("Тема – ", { bold: true, size: 13 }) + run(topic, { italic: true, size: 13 }), { after: 60 });
    }
    if (task.description) {
      info += paragraph(run("Описание – ", { bold: true, size: 13 }) + run(task.description, { size: 13 }), { after: 60 });
    }
    for (const b of siblings) {
      if (b === primaryPhoto || b.type === "divider") continue;
      info += addBlock(b);
    }
    if (task.deadline) {
      const [y, m, d] = task.deadline.split("-");
      info += paragraph(run("Дедлайн: Видео должно быть готовым к " + d + "." + m + "." + y, { bold: true, size: 14, color: "E10000" }), { before: 60, after: 40, keepNext: true });
    }
    if (task.assignee) info += paragraph(run("Ответственное лицо – " + task.assignee, { bold: true, size: 13.5 }), { before: 45, after: 20 });
    let photoContent = "";
    if (imageRid && primary) {
      const width = 1910 * 635;
      const height = Math.min(3200 * 635, width * primary.height / primary.width);
      photoContent = paragraph(imageRun(imageRid, picSerial++, width, height, primaryPhoto?.props.caption || "Референс"), { after: 40 });
    }
    body += twoColumn(info, photoContent) + paragraph("", { after: 185, border: true });
  }

  const section = '<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="790" w:right="835" w:bottom="900" w:left="835" w:header="200" w:footer="300" w:gutter="0"/>' +
    '<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>';
  files.push({ name: "word/document.xml", data: bytes(XML + '<w:document ' + NS + '><w:body>' + body + section + '</w:body></w:document>') });

  let watermarkHeader = paragraph("");
  if (resources.watermark) {
    const rid = "rIdWatermark";
    const target = "media/watermark-export.png";
    files.push({ name: "word/" + target, data: resources.watermark.bytes });
    headerRelationships.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="' + target + '"/>');
    watermarkHeader = '<w:p><w:r><w:pict><v:shape id="IPOSWatermark" type="#_x0000_t75" stroked="f" ' +
      'style="position:absolute;width:330pt;height:500pt;z-index:-251658240;mso-position-horizontal:center;mso-position-horizontal-relative:page;mso-position-vertical:center;mso-position-vertical-relative:page">' +
      '<v:imagedata r:id="' + rid + '" o:title="Watermark"/></v:shape></w:pict></w:r></w:p>';
  } else warnings.push("Водяной знак недоступен: экспортирован без фона.");
  files.push({ name: "word/header1.xml", data: bytes(XML +
    '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">' +
    watermarkHeader + '</w:hdr>') });
  const relsNs = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
  relationships.push('<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>');
  files.push({ name: "word/_rels/document.xml.rels", data: bytes(XML + '<Relationships ' + relsNs + '>' + relationships.join("") + '</Relationships>') });
  files.push({ name: "word/_rels/header1.xml.rels", data: bytes(XML + '<Relationships ' + relsNs + '>' + headerRelationships.join("") + '</Relationships>') });
  files.push({ name: "word/styles.xml", data: bytes(XML + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="26"/><w:color w:val="17191D"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>') });
  files.push({ name: "[Content_Types].xml", data: bytes(XML +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '</Types>') });
  files.push({ name: "_rels/.rels", data: bytes(XML + '<Relationships ' + relsNs + '>' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '</Relationships>') });
  files.push({ name: "docProps/core.xml", data: bytes(XML +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    '<dc:title>' + xml(plan.title) + '</dc:title><dc:creator>IPOS.Plan</dc:creator></cp:coreProperties>') });
  return { bytes: makeZip(files), warnings };
}

async function fetchImage(url: string): Promise<DocxImage | undefined> {
  if (!/^https?:\/\//.test(url) && !url.startsWith("/")) return undefined;
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (!["image/png", "image/jpeg"].includes(blob.type) || blob.size > 4_000_000) return undefined;
    const bitmap = await createImageBitmap(blob);
    const image: DocxImage = { bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type as DocxImage["type"], width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return image;
  } catch { return undefined; }
}
async function renderLogo(alpha: number): Promise<DocxImage | undefined> {
  try {
    const image = new Image();
    image.src = "/student-council-emblem.svg";
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 680;
    canvas.height = 840;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return undefined;
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: "image/png", width: canvas.width, height: canvas.height };
  } catch { return undefined; }
}
export async function exportPlanDocx(plan: PortablePlan): Promise<DocxExport> {
  const urls = new Map<string, string>();
  const walk = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.type === "image" && block.id && block.props.url) urls.set(block.id, block.props.url);
      walk(block.children ?? []);
    }
  };
  walk(plan.blocks);
  const pairs = await Promise.all([...urls].map(async ([id, url]) => [id, await fetchImage(url)] as const));
  const images: Record<string, DocxImage> = {};
  const warnings: string[] = [];
  for (const [id, image] of pairs) {
    if (image) images[id] = image;
    else warnings.push("Некоторые изображения недоступны из браузера. Их URL сохранены как ссылки.");
  }
  const [emblem, watermark] = await Promise.all([renderLogo(1), renderLogo(.11)]);
  const result = buildPlanDocx(plan, { emblem, watermark, images });
  return { bytes: result.bytes, warnings: [...new Set([...warnings, ...result.warnings])] };
}
export { DOCX_TYPE };
