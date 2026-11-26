"use client";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "react-day-picker/locale/ru";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Field, FieldLabel } from "@/components/ui/field";

export function DeadlinePicker({
  id,
  value,
  onChange,
  label = "Дедлайн",
  chooseLabel = "Выбрать дедлайн",
  calendarLabel = "Календарь дедлайна",
  clearLabel = "Убрать дедлайн",
}: {
  id: string;
  value?: string;
  label?: string;
  chooseLabel?: string;
  calendarLabel?: string;
  clearLabel?: string;
  onChange: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className="deadline-trigger"
            aria-label={chooseLabel}
            aria-describedby={`${id}-value`}
          >
            <CalendarDays data-icon="inline-start" />
            <span id={`${id}-value`}>
              {selected ? format(selected, "dd.MM.yyyy") : "Не указан"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="deadline-popover"
          aria-label={calendarLabel}
          collisionPadding={12}
        >
          <Calendar
            mode="single"
            locale={ru}
            selected={selected}
            defaultMonth={selected}
            autoFocus
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : undefined);
              setOpen(false);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="deadline-clear"
            disabled={!value}
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            {clearLabel}
          </Button>
        </PopoverContent>
      </Popover>
    </Field>
  );
}
