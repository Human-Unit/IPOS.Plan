import Dexie, { type EntityTable } from "dexie";
import type { Plan } from "@/lib/schema/plan";
export type Activity = {
  id: string;
  planId: string;
  type: string;
  createdAt: string;
  message: string;
  metadata?: Record<string, unknown>;
};
export type Revision = {
  id: string;
  planId: string;
  createdAt: string;
  title: string;
  snapshot: Plan;
};
export type Setting = { key: string; value: unknown };
export class PlanDatabase extends Dexie {
  plans!: EntityTable<Plan, "id">;
  activity!: EntityTable<Activity, "id">;
  revisions!: EntityTable<Revision, "id">;
  settings!: EntityTable<Setting, "key">;
  constructor(name = "ipos-content-plans") {
    super(name);
    this.version(1).stores({
      plans: "id, updatedAt",
      activity: "id, planId, createdAt",
      revisions: "id, planId, createdAt",
      settings: "key",
    });
  }
}
export const db = new PlanDatabase();
