"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
export const PlanRenderer = dynamic(
  () => import("@/components/editor/plan-renderer"),
  {
    ssr: false,
    loading: () => (
      <div className="loading-document">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    ),
  },
);
