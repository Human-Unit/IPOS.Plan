"use client";
import { useSyncExternalStore } from "react";
import { localDate } from "./productivity";
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout>;
function schedule() {
  clearTimeout(timer);
  listeners.forEach(callback => callback());
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  timer = setTimeout(schedule, midnight.getTime() - now.getTime() + 50);
}
function subscribe(callback: () => void) {
  listeners.add(callback);
  if (listeners.size === 1) {
    schedule();
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("focus", schedule);
  }
  return () => {
    listeners.delete(callback);
    if (!listeners.size) { clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); window.removeEventListener("focus", schedule); }
  };
}
export function useLocalDate() { return useSyncExternalStore(subscribe, () => localDate(), () => ""); }
