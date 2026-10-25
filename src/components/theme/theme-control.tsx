"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import { changeTheme, type ThemePreference } from "@/lib/theme-wave";

const subscribe = () => () => {};
const options = [
  { value: "light", label: "Светлая", Icon: Sun },
  { value: "dark", label: "Тёмная", Icon: Moon },
  { value: "system", label: "Как в системе", Icon: Monitor },
] as const;

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const returnEditorFocus = useRef<(() => void) | undefined>(undefined);
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
        window
          .getSelection()
          ?.setBaseAndExtent(anchor, anchorOffset, focus, focusOffset);
      } else if (range?.startContainer.isConnected) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      window.scrollTo(scroll);
    };
  }
  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button
          ref={trigger}
          className="theme-control"
          variant="ghost"
          size="icon"
          aria-label="Тема оформления"
          title="Тема оформления"
          onPointerDown={captureEditor}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") captureEditor();
          }}
        >
          {/* CSS chooses the initial icon before hydration; the box never changes. */}
          <Sun className="theme-light-icon" />
          <Moon className="theme-dark-icon" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="plan-actions-menu theme-menu"
          align="end"
          sideOffset={8}
          aria-label="Тема оформления"
          onInteractOutside={() => {
            returnEditorFocus.current = undefined;
          }}
          onCloseAutoFocus={(event) => {
            if (returnEditorFocus.current) {
              event.preventDefault();
              returnEditorFocus.current();
              returnEditorFocus.current = undefined;
            }
          }}
        >
          <DropdownMenu.Label className="theme-menu-label">
            Тема оформления
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={mounted ? theme : undefined}
            onValueChange={(value) => {
              // Dismiss before capturing either snapshot, so the menu cannot
              // linger as a frozen overlay inside the reveal.
              flushSync(() => setOpen(false));
              if (trigger.current)
                void changeTheme(
                  value as ThemePreference,
                  setTheme,
                  trigger.current,
                );
            }}
          >
            {options.map(({ value, label, Icon }) => (
              <DropdownMenu.RadioItem key={value} value={value}>
                <Icon aria-hidden="true" />
                {label}
                <DropdownMenu.ItemIndicator className="theme-check">
                  <Check aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
