"use client";
import type { ReactNode } from "react";
import { usePlanContext } from "./plan-context";

export function SelectableBlock({
  id,
  label,
  className,
  children,
  openPropertiesOnSelect = true,
}: {
  id: string;
  label: string;
  className: string;
  children: ReactNode;
  openPropertiesOnSelect?: boolean;
}) {
  const { editable, selectedId, selectBlock } = usePlanContext();
  return (
    <section
      className={className}
      contentEditable={false}
      aria-label={label}
      data-plan-block={id}
      data-selected={editable && selectedId === id ? "true" : undefined}
      tabIndex={editable ? 0 : undefined}
      onClick={
        editable
          ? (event) => {
              event.stopPropagation();
              selectBlock?.(id, openPropertiesOnSelect);
            }
          : undefined
      }
      onKeyDown={
        editable
          ? (event) => {
              if (
                event.target === event.currentTarget &&
                ["Enter", " "].includes(event.key)
              ) {
                event.preventDefault();
                selectBlock?.(id);
              }
            }
          : undefined
      }
    >
      {children}
    </section>
  );
}
