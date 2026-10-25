"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { surfaceTransition } from "@/lib/motion";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="ipos-plan-theme"
    >
      <MotionConfig reducedMotion="user" transition={surfaceTransition}>
        {children}
      </MotionConfig>
    </ThemeProvider>
  );
}
