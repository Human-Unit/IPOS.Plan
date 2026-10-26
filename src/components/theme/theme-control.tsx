"use client";

import { useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeTheme } from "@/lib/theme-wave";

const subscribe = () => () => {};

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnEditorFocus = useRef<(() => void) | undefined>(undefined);
  const dark = !mounted || theme !== "light";

  // Preserve the active editor's cursor and unsaved input when clicking the
  // toggle, rather than letting a theme change steal its selection or scroll.
  function captureEditor() {
    const element = document.activeElement;
    returnEditorFocus.current = undefined;
    if (!(element instanceof HTMLElement) || !element.closest(".plan-paper"))
      return;
    const selected = window.getSelection();
    const range = selected?.rangeCount
      ? selected.getRangeAt(0).cloneRange()
      : undefined;
    const anchor = selected?.anchorNode;
    const focus = selected?.focusNode;
    const anchorOffset = selected?.anchorOffset ?? 0;
    const focusOffset = selected?.focusOffset ?? 0;
    const input =
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement
        ? element
        : undefined;
    const start = input?.selectionStart;
    const end = input?.selectionEnd;
    const direction = input?.selectionDirection;
    const scroll = { left: scrollX, top: scrollY };
    returnEditorFocus.current = () => {
      if (!element.isConnected) return;
      element.focus({ preventScroll: true });
      if (input && start != null && end != null)
        input.setSelectionRange(start, end, direction ?? undefined);
      else if (anchor?.isConnected && focus?.isConnected) {
        window.getSelection()?.setBaseAndExtent(
          anchor, anchorOffset, focus, focusOffset,
        );
      } else if (range?.startContainer.isConnected) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      window.scrollTo(scroll);
    };
  }

  return (
    <Button
      ref={trigger}
      type="button"
      variant="ghost"
      size="icon"
      className="theme-control"
      role="switch"
      aria-label="Тёмная тема"
      aria-checked={dark}
      title={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      onPointerDown={captureEditor}
      onClick={() => {
        const next = document.documentElement.classList.contains("dark")
          ? "light"
          : "dark";
        const restoreFocus = returnEditorFocus.current;
        returnEditorFocus.current = undefined;
        if (trigger.current)
          void changeTheme(next, setTheme, trigger.current).finally(() => {
            restoreFocus?.();
          });
      }}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb" />
        <Sun className="theme-toggle-sun" />
        <Moon className="theme-toggle-moon" />
      </span>
    </Button>
  );
}
