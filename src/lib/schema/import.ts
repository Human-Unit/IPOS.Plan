import { MAX_JSON_BYTES, portablePlanSchema, type PortablePlan } from "./plan";
export function parseImport(raw: string): PortablePlan {
  if (new TextEncoder().encode(raw).length > MAX_JSON_BYTES)
    throw new Error("Файл больше 1 МБ. Уменьшите план.");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Некорректный JSON: проверьте кавычки, запятые и скобки.");
  }
  // Reject excessive depth before recursive schema evaluation.
  const queue: [unknown, number][] = [[value, 0]];
  while (queue.length) {
    const [v, depth] = queue.pop()!;
    if (depth > 40) throw new Error("Слишком глубоко вложенный JSON.");
    if (v && typeof v === "object")
      for (const child of Object.values(v)) queue.push([child, depth + 1]);
  }
  const result = portablePlanSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      result.error.issues
        .slice(0, 8)
        .map((i) => `${i.path.join(".") || "План"}: ${i.message}`)
        .join("\n"),
    );
  return result.data;
}
