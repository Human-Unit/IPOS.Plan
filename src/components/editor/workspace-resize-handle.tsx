"use client";

import type { PointerEvent as ReactPointerEvent, KeyboardEvent } from "react";

type Props = {
  label: string;
  width: number;
  min: number;
  max: number;
  invert?: boolean;
  onChange: (width: number) => void;
};

export function WorkspaceResizeHandle({ label, width, min, max, invert = false, onChange }: Props) {
  const clamp = (value: number) => Math.max(min, Math.min(max, Math.round(value)));
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const original = width;
    const direction = invert ? -1 : 1;
    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const move = (e: PointerEvent) => onChange(clamp(original + (e.clientX - startX) * direction));
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelection;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
    window.addEventListener("pointercancel", end, { once: true });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 20 : 10;
    const direction = invert ? -1 : 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      onChange(clamp(width + (event.key === "ArrowRight" ? step : -step) * direction));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(min);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(max);
    }
  };

  return (
    <div
      className={`workspace-resize-handle${invert ? " from-right" : ""}`}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      title="Потяните для изменения ширины. Стрелки - по 10 px."
    />
  );
}
