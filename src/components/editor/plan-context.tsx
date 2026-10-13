"use client";
import { createContext, useContext } from "react";
import type { PortablePlan } from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
export const PlanContext = createContext<{
  plan: PortablePlan;
  editable: boolean;
  updateTask?: (task: Task) => void;
} | null>(null);
export function usePlanContext() {
  const value = useContext(PlanContext);
  if (!value) throw new Error("PlanRenderer context is missing");
  return value;
}
