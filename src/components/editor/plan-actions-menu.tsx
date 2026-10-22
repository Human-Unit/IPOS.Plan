"use client";
import { DropdownMenu } from "radix-ui";
import {
  MoreHorizontal,
  History,
  BookmarkPlus,
  Upload,
  Download,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlanActionsMenu({
  disabled,
  onHistory,
  onSave,
  onImport,
  onExport,
  onPrint,
  readonly = false,
}: {
  disabled: boolean;
  onHistory: () => void;
  onSave: () => void;
  onImport: () => void;
  onExport: () => void;
  onPrint?: () => void;
  readonly?: boolean;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          size="icon"
          variant="ghost"
          disabled={disabled}
          aria-label="Другие действия"
          title="История, импорт, экспорт и печать"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="plan-actions-menu"
          align="end"
          sideOffset={8}
        >
          {!readonly && (
            <DropdownMenu.Group>
              <DropdownMenu.Item onSelect={onHistory}>
                <History aria-hidden="true" />
                История
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onSave}>
                <BookmarkPlus aria-hidden="true" />
                Сохранить версию
              </DropdownMenu.Item>
            </DropdownMenu.Group>
          )}
          {!readonly && <DropdownMenu.Separator className="menu-rule" />}
          <DropdownMenu.Group>
            {onPrint && (
              <DropdownMenu.Item onSelect={onPrint}>
                <Printer aria-hidden="true" />
                Печать / PDF (A4)
              </DropdownMenu.Item>
            )}
            {!readonly && (
              <DropdownMenu.Item onSelect={onImport}>
                <Upload aria-hidden="true" />
                Импорт
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item onSelect={onExport}>
              <Download aria-hidden="true" />
              <span>
                Экспорт <small aria-hidden="true">JSON · Word</small>
              </span>
            </DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
