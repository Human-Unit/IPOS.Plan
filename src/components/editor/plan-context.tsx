"use client";
import { createContext, useContext } from "react";
import type { Block, PortablePlan } from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
export const PlanContext = createContext<{
  plan: PortablePlan;
  editable: boolean;
  updateTask?: (task: Task) => void;
  selectedId?: string;
  selectBlock?: (id: string, openProperties?: boolean) => void;
  companions: Record<string, Block[]>;
  embeddedIds: Set<string>;
} | null>(null);
export function usePlanContext() {
  const value = useContext(PlanContext);
  if (!value) throw new Error("PlanRenderer context is missing");
  return value;
}
