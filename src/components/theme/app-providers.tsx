"use client";

import { useEffect } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { MotionConfig } from "motion/react";
import { surfaceTransition } from "@/lib/motion";

// Existing visitors might have stored the old third option. Migrate it to
// dark once; system/device theme is not an application preference anymore.
function MigrateLegacySystemTheme() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    if (theme === "system") setTheme("dark");
  }, [theme, setTheme]);
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      themes={["light", "dark"]}
      defaultTheme="dark"
      enableSystem={false}
      storageKey="ipos-plan-theme"
    >
      <MigrateLegacySystemTheme />
      <MotionConfig reducedMotion="user" transition={surfaceTransition}>
        {children}
      </MotionConfig>
    </ThemeProvider>
  );
}
