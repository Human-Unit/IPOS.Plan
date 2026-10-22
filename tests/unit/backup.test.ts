import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import { createPlan, saveRevision } from "@/features/plans/repository";
import { demoPlan } from "@/features/plans/demo";
import { exportLibrary, parseBackup, restoreLibrary, MAX_BACKUP_BYTES } from "@/features/backup/backup";

beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())); });
describe("atomic library backups", () => {
  it("round-trips an empty library", async () => {
    const b = await exportLibrary();
    expect(b.plans).toEqual([]);
    expect((await restoreLibrary(b, "copies")).plans).toBe(0);
  });
  it("round-trips multiple plans, metadata, inline images, revisions, activity and settings", async () => {
    const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=";
    const p = await createPlan({ ...demoPlan, blocks: [...demoPlan.blocks, { id: "inline-image", type: "image", props: { url: image, caption: "Снимок" } }] });
    await createPlan(); await saveRevision(p);
    await db.settings.add({ key: "demo-seeded-v1", value: true });
    const b = await exportLibrary();
    await Promise.all(db.tables.map(t => t.clear()));
    const r = await restoreLibrary(parseBackup(JSON.stringify(b)), "skip");
    expect(r).toMatchObject({ plans: 2, revisions: 1, activity: 2, settings: 1 });
    expect(await db.plans.toArray()).toEqual(b.plans);
    expect((await db.revisions.toArray())[0].snapshot).toEqual(p);
    expect((await db.activity.toArray()).map(a => ({ ...a, id: "" })).sort((a,b) => a.planId.localeCompare(b.planId))).toEqual(b.activity.map(a => ({ ...a, id: "" })).sort((a,b) => a.planId.localeCompare(b.planId)));
    expect((await db.plans.get(p.id))!.blocks.at(-1)).toMatchObject({ props: { url: image } });
  });
  it("copies remap history and snapshot plan IDs while preserving task/block links", async () => {
    const p = await createPlan(demoPlan); await saveRevision(p);
    const b = await exportLibrary(); const r = await restoreLibrary(b, "copies");
    expect(r.plans).toBe(1);
    const copied = (await db.plans.toArray()).find(row => row.id !== p.id)!;
    expect(copied.tasks).toEqual(p.tasks); expect(copied.blocks).toEqual(p.blocks);
    expect((await db.revisions.where({ planId: copied.id }).first())!.snapshot.id).toBe(copied.id);
    expect(await db.activity.where({ planId: copied.id }).count()).toBe(1);
    expect(await db.plans.get(p.id)).toEqual(p);
    expect((await restoreLibrary(b, "skip"))).toMatchObject({ plans: 0, revisions: 0, activity: 0, skipped: 1 });
  });
  it("rejects duplicate IDs, invalid links, unsafe keys, incompatible, malformed and excessive input", async () => {
    const p = await createPlan(demoPlan); await saveRevision(p); const b = await exportLibrary();
    for (const bad of [
      { ...b, plans: [p,p] }, { ...b, revisions: [b.revisions[0], b.revisions[0]] }, { ...b, activity: [b.activity[0], b.activity[0]] },
      { ...b, formatVersion: 2 }, { ...b, plans: [] }, { ...b, revisions: [{ ...b.revisions[0], snapshot: { ...p, id: "other" } }] },
      { ...b, plans: [{ ...p, blocks: [{ type: "image", props: { url: "data:text/html;base64,PHNjcmlwdD4=", caption: "" } }] }] },
    ]) expect(() => parseBackup(JSON.stringify(bad))).toThrow();
    expect(() => parseBackup('{"__proto__":{}}')).toThrow(/ключ/);
    expect(() => parseBackup("{")).toThrow(/JSON/);
    expect(() => parseBackup(" ".repeat(MAX_BACKUP_BYTES + 1))).toThrow(/50 МБ/);
    expect(await db.plans.get(p.id)).toEqual(p);
  });
  for (const name of ["QuotaExceededError", "ConstraintError"]) it(`rolls all four tables back on ${name}`, async () => {
    const p = await createPlan(demoPlan); await saveRevision(p); const b = await exportLibrary();
    const fail = () => { throw new DOMException("storage failure", name); };
    db.settings.hook("creating", fail);
    try {
      await expect(restoreLibrary({ ...b, settings: [{ key: "demo-seeded-v1", value: true }] }, "copies")).rejects.toThrow();
    } finally { db.settings.hook("creating").unsubscribe(fail); }
    expect(await exportLibrary()).toMatchObject({ plans: b.plans, revisions: b.revisions, activity: b.activity, settings: b.settings });
  });
});
