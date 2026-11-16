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
    // The previous version persisted "system" even though only Light/Dark
    // is supported now. Read storage directly: next-themes may expose the
    // effective "dark" value while leaving the legacy "system" class behind.
    let storedLegacy = false;
    try {
      storedLegacy = localStorage.getItem("ipos-plan-theme") === "system";
    } catch { /* Storage can be unavailable in private browsing. */ }
    // An older class may remain even after next-themes has normalized its
    // state/storage: only the configured classes "light" and "dark" are
    // removed by that library, so an orphan "system" must be cleared here.
    const root = document.documentElement;
    if (theme === "system" || storedLegacy || root.classList.contains("system")) {
      setTheme("dark");
      root.classList.remove("system");
    }
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
