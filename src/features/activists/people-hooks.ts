"use client";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { errorMessage } from "@/lib/labels";
import { listPeople, migrateLegacyPeople } from "./people-repository";
export function usePeople() {
  const [migrationError, setMigrationError] = useState("");
  useEffect(() => {
    void migrateLegacyPeople()
      .then((result) => {
        if (result.invalid)
          setMigrationError(
            `Не удалось прочитать сохранённых имён: ${result.invalid}. Исходные записи оставлены без изменений.`,
          );
      })
      .catch((e) => setMigrationError(errorMessage(e)));
  }, []);
  const result = useLiveQuery(async () => {
    try {
      return { people: await listPeople(), error: "" };
    } catch (e) {
      return { people: [], error: errorMessage(e) };
    }
  });
  return {
    people: result?.people ?? [],
    ready: Boolean(result),
    error: migrationError || result?.error || "",
  };
}
