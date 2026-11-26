"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/database";
import { errorMessage } from "@/lib/labels";

export function useEditorialPlans() {
  return useLiveQuery(async () => {
    try { return { plans: await db.plans.orderBy("updatedAt").reverse().toArray(), error: "" }; }
    catch (error) { return { plans: [], error: errorMessage(error) }; }
  });
}
