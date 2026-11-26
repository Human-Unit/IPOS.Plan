"use client";
import { createContext, useContext } from "react";
import type { Block, LocalPlanContent } from "@/lib/schema/plan";
import type { TaskAssignment } from "@/lib/schema/task-assignment";
import type { ProductionStage, ReviewCommand, TaskEditorial } from "@/lib/schema/editorial";
import type { Task } from "@/lib/schema/task";
export const PlanContext = createContext<{
  plan: LocalPlanContent;
  updateAssignment?: (taskId: string, value: TaskAssignment | undefined, textWhenEmpty?: string) => void;
  reviewAction?: (taskId: string, action: ReviewCommand, feedback?: string) => Promise<void>;
  updateStage?: (taskId: string, stage: ProductionStage) => void;
  updateEditorial?: (taskId: string, change: Partial<TaskEditorial>) => void;
  openPerson?: (id: string) => void;
  editable: boolean;
  updateTask?: (task: Task) => void;
  selectedId?: string;
  selectBlock?: (id: string, openProperties?: boolean) => void;
  companions: Record<string, Block[]>;
  embeddedIds: Set<string>;
  collapsedIds?: ReadonlySet<string>;
  toggleBrief?: (id: string) => void;
  addToBrief?: (
    id: string,
    type: "requirement" | "reference" | "image" | "file",
  ) => void;
  duplicateBrief?: (id: string) => void;
  saveTemplate?: (id: string) => void;
  moveBrief?: (id: string, direction: "up" | "down") => void;
  removeBrief?: (id: string) => void;
  taskOrder?: ReadonlyMap<string,number>;
  replaceImage?: (id: string) => void;
} | null>(null);
export function usePlanContext() {
  const value = useContext(PlanContext);
  if (!value) throw new Error("PlanRenderer context is missing");
  return value;
}
