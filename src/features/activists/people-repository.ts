import { db, type Setting } from "@/lib/db/database";
import {
  personSchema,
  personDraftSchema,
  type Person,
  type PersonDraft,
} from "@/lib/schema/person";
import { ACTIVIST_PREFIX, activistEntrySchema } from "./directory";

export const PERSON_PREFIX = "person:";
export function peopleFromRows(rows: Setting[]): Person[] {
  return rows
    .filter((r) => r.key.startsWith(PERSON_PREFIX))
    .map((r) => {
      const person = personSchema.parse(r.value);
      if (r.key !== PERSON_PREFIX + person.id)
        throw new Error("Нарушен ID профиля в локальном справочнике.");
      return person;
    })
    .sort(
      (a, b) =>
        a.displayName.localeCompare(b.displayName, "ru") ||
        a.id.localeCompare(b.id),
    );
}
export async function listPeople() {
  return peopleFromRows(
    await db.settings.filter((r) => r.key.startsWith(PERSON_PREFIX)).toArray(),
  );
}
export async function getPerson(id: string) {
  const row = await db.settings.get(PERSON_PREFIX + id);
  return row ? peopleFromRows([row])[0] : undefined;
}
export async function createPerson(input: PersonDraft): Promise<Person> {
  const draft = personDraftSchema.parse(input);
  const date = new Date().toISOString();
  const person = personSchema.parse({
    ...draft,
    id: crypto.randomUUID(),
    createdAt: date,
    updatedAt: date,
    version: 1,
  });
  await db.transaction("rw", db.settings, async () => {
    if (
      (await db.settings
        .filter((r) => r.key.startsWith(PERSON_PREFIX))
        .count()) >= 1000
    )
      throw new Error("Не более 1000 профилей в локальном справочнике.");
    await db.settings.add({ key: PERSON_PREFIX + person.id, value: person });
  });
  return person;
}
export async function updatePerson(
  id: string,
  input: PersonDraft,
  expectedVersion: number,
): Promise<Person> {
  const draft = personDraftSchema.parse(input);
  return db.transaction("rw", db.settings, async () => {
    const current = await getPerson(id);
    if (!current) throw new Error("Профиль не найден. Обновите страницу.");
    if (current.version !== expectedVersion)
      throw new Error(
        "Профиль изменён в другой вкладке. Обновите страницу перед редактированием.",
      );
    const next = personSchema.parse({
      ...current,
      ...draft,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    });
    await db.settings.put({ key: PERSON_PREFIX + id, value: next });
    return next;
  });
}
/** One preserved legacy row -> one candidate. Name similarity never establishes identity. */
export async function migrateLegacyPeople() {
  return db.transaction("rw", db.settings, async () => {
    const rows = await db.settings.toArray();
    const people = peopleFromRows(rows);
    const migrated = new Set(people.map((p) => p.sourceKey).filter(Boolean));
    const additions: Setting[] = [];
    let invalid = 0;
    for (const row of rows.filter((r) => r.key.startsWith(ACTIVIST_PREFIX))) {
      if (migrated.has(row.key)) continue;
      const parsed = activistEntrySchema.safeParse(row.value);
      if (!parsed.success) {
        invalid++;
        continue;
      }
      const date = new Date().toISOString();
      const person = personSchema.parse({
        id: crypto.randomUUID(),
        displayName: parsed.data.name,
        aliases: [],
        role: "",
        specializations: [],
        membershipStatus: "candidate",
        notes: "",
        createdAt: parsed.data.createdAt,
        updatedAt: date,
        version: 1,
        sourceKey: row.key,
      });
      additions.push({ key: PERSON_PREFIX + person.id, value: person });
    }
    if (people.length + additions.length > 1000)
      throw new Error(
        "Миграция отменена: справочник превысит 1000 профилей. Исходные имена сохранены.",
      );
    if (additions.length) await db.settings.bulkAdd(additions);
    return { created: additions.length, invalid };
  });
}
