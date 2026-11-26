"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { EditorialHeader } from "@/components/plan/editorial-header";
import { assignmentRows, type AssignmentRow } from "@/features/activists/workload";
import { usePeople } from "@/features/activists/people-hooks";
import { taskHref } from "@/features/activists/task-assignments";
import { savePlan } from "@/features/plans/repository";
import { deadlineInfo } from "@/features/plans/productivity";
import { useLocalDate } from "@/features/plans/use-local-date";
import { errorMessage } from "@/lib/labels";
import type { Plan } from "@/lib/schema/plan";
import { productionStages, stageLabels, type ProductionStage } from "@/lib/schema/editorial";
import { displayDay } from "./calendar";
import { EditorialFilters, defaultEditorialFilter, editorialMatches } from "./editorial-filters";
import { moveTaskToStage, productionStage } from "./stages";
import { publicationReady } from "./review";
import { useEditorialPlans } from "./use-editorial-plans";

const boardKey = (row: AssignmentRow) => taskHref(row.planId, row.task.id);

export function BoardScreen() {
  const library = useEditorialPlans();
  const roster = usePeople();
  const today = useLocalDate();
  const [filter, setFilter] = useState(defaultEditorialFilter);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [dropTarget, setDropTarget] = useState<ProductionStage>();
  const board = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const moveInFlight = useRef(false);
  const drag = useRef<{ plan: Plan; row: AssignmentRow } | null>(null);
  const focus = useRef<{ key: string; stage: ProductionStage; planId: string; version: number } | null>(null);
  const data = useMemo(() => {
    const plans = new Map(library?.plans.map((plan) => [plan.id, plan]));
    const byStage = new Map<ProductionStage | null, AssignmentRow[]>();
    for (const row of assignmentRows(library?.plans ?? [])) {
      if (!editorialMatches(row, filter)) continue;
      const stage = productionStage(row.task, row.editorial, row.personIds.length > 0);
      const rows = byStage.get(stage) ?? [];
      rows.push(row);
      byStage.set(stage, rows);
    }
    return { plans, byStage };
  }, [filter, library]);
  useEffect(() => {
    if (busy || !focus.current) return;
    const request = focus.current;
    const version = data.plans.get(request.planId)?.version;
    if (version !== undefined && version < request.version) return;
    const replacement = Array.from(board.current?.querySelectorAll<HTMLSelectElement>("[data-stage-task]") ?? [])
      .find((select) => select.dataset.stageTask === request.key && select.value === request.stage);
    focus.current = null;
    (replacement ?? title.current)?.focus();
  }, [data, busy]);

  async function move(plan: Plan, row: AssignmentRow, stage: ProductionStage, restoreFocus: boolean) {
    if (moveInFlight.current) return;
    moveInFlight.current = true;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      const saved = await savePlan(moveTaskToStage(plan, row.task.id, stage));
      if (restoreFocus) focus.current = { key: boardKey(row), stage, planId: saved.id, version: saved.version };
      setNotice("Задача «" + (saved.tasks[row.task.id].title || "Без названия") + "» перемещена в «" + stageLabels[stage] + "».");
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      moveInFlight.current = false;
      setBusy(false);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>, stage: ProductionStage) {
    if (!drag.current) return;
    event.preventDefault();
    const { plan, row } = drag.current;
    drag.current = null;
    setDropTarget(undefined);
    if (productionStage(row.task, row.editorial, row.personIds.length > 0) !== stage) void move(plan, row, stage, false);
  }

  function card(row: AssignmentRow, stage: ProductionStage | null) {
    const key = boardKey(row);
    const plan = data.plans.get(row.planId);
    const legacyDone = stage === "published" && row.editorial?.stage !== "published";
    const overdue = deadlineInfo(row.task, today).kind === "overdue";
    return (
      <li key={key} className="board-card" draggable={Boolean(stage && plan && !busy)}
        onDragStart={(event) => {
          if (!stage || !plan || busy) return;
          event.dataTransfer.setData("text/plain", key);
          event.dataTransfer.effectAllowed = "move";
          drag.current = { plan, row };
        }}
        onDragEnd={() => { drag.current = null; setDropTarget(undefined); }}
      >
        <Link href={key}>{row.task.title || "Задача без названия"}</Link>
        <small>{row.planTitle}</small>
        {row.task.assignee && <small>{row.task.assignee}</small>}
        {row.task.deadline && <small data-overdue={overdue || undefined}>
          {overdue ? "Просрочен" : "Дедлайн"} <time dateTime={row.task.deadline}>{displayDay(row.task.deadline)}</time>
        </small>}
        {row.editorial?.publicationDate && <small>
          Плановая публикация <time dateTime={row.editorial.publicationDate}>{displayDay(row.editorial.publicationDate)}</time>
        </small>}
        {publicationReady(row.task, row.editorial?.review) && <small className="board-ready">Готово к публикации</small>}
        {legacyDone && <small className="board-legacy">Готово по прежнему статусу</small>}
        {stage === "assigned" && !row.personIds.length && <small className="board-legacy">Без подтверждённого участника</small>}
        {stage && plan && (
          <select className="board-move" data-stage-task={key}
            aria-label={"Переместить задачу: " + (row.task.title || "Без названия")}
            value={stage}
            disabled={busy}
            onChange={(event) => void move(plan, row, event.target.value as ProductionStage, true)}
          >
            {productionStages.map((option) => <option key={option} value={option}>{stageLabels[option]}</option>)}
          </select>
        )}
      </li>
    );
  }

  const error = failure || library?.error || roster.error;
  const cancelled = data.byStage.get(null) ?? [];
  return (
    <>
      <EditorialHeader backHref="/" backLabel="К планам" />
      <main className="people-page editorial-board" ref={board}>
        <div className="people-heading">
          <div>
            <h1 ref={title} tabIndex={-1}>Доска производства</h1>
            <p className="muted">Перетащите задачу или выберите этап в карточке. Этап «Опубликовано» не выпускает документ.</p>
          </div>
        </div>
        <EditorialFilters plans={library?.plans ?? []} people={roster.people} filter={filter} onChange={setFilter} />
        {error && <p role="alert" className="person-error">{error}</p>}
        <p role="status" className="board-notice">{notice || (!library ? "Загрузка задач…" : "")}</p>
        <div className="board-columns">
          {productionStages.map((stage) => {
            const rows = data.byStage.get(stage) ?? [];
            return <section key={stage} className="board-column" data-stage={stage}
              data-dropping={dropTarget === stage || undefined}
              aria-labelledby={"stage-" + stage}
              onDragOver={(event) => {
                if (!drag.current) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(stage);
              }}
              onDrop={(event) => onDrop(event, stage)}
            >
              <h2 id={"stage-" + stage}>{stageLabels[stage]} <span>{rows.length}</span></h2>
              {rows.length ? <ul>{rows.map((row) => card(row, stage))}</ul>
                : <p className="board-empty">Нет задач</p>}
            </section>;
          })}
        </div>
        {!!cancelled.length && <details className="board-cancelled"><summary>Отменённые · {cancelled.length}</summary>
          <ul>{cancelled.map((row) => card(row, null))}</ul>
        </details>}
      </main>
    </>
  );
}
