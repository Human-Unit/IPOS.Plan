"use client";
import { useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/plan/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { normalizeSearch } from "@/features/plans/productivity";
import { membershipLabels, specializationLabels } from "@/lib/schema/person";
import { usePeople } from "./people-hooks";
import { PersonForm } from "./person-form";
import { useRouter } from "next/navigation";
import { LegacyReview } from "./legacy-review";

export function PeopleScreen() {
  const { people, ready, error } = usePeople();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [specialization, setSpecialization] = useState("all");
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const visible = people.filter(
    (p) =>
      normalizeSearch([p.displayName, ...p.aliases].join(" ")).includes(
        normalizeSearch(query),
      ) &&
      (status === "all" || p.membershipStatus === status) &&
      (specialization === "all" ||
        p.specializations.some((s) => s === specialization)),
  );
  return (
    <>
      <header className="app-bar">
        <Brand />
        <Button asChild variant="ghost">
          <Link href="/">К планам</Link>
        </Button>
      </header>
      <main className="people-page">
        <div className="people-heading">
          <div>
            <p className="panel-eyebrow">Медиасектор ИПОС</p>
            <h1>Активисты</h1>
            <p className="muted">
              Локальный справочник людей. Назначение на задачу не подтверждает
              членство.
            </p>
          </div>
          <div className="people-heading-actions"><Button asChild variant="outline"><Link href="/activists/workload">Нагрузка команды</Link></Button><Button onClick={() => setAdding(true)}>Добавить человека</Button></div>
        </div>
        {error && (
          <p className="person-error" role="alert">
            {error}
          </p>
        )}
        <div
          className="people-filters"
          role="search"
          aria-label="Поиск активистов"
        >
          <Input
            type="search"
            aria-label="Поиск людей"
            placeholder="Имя или другое написание…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Статус участника"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Любое членство</option>
            {Object.entries(membershipLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="Специализация участника"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
          >
            <option value="all">Любая специализация</option>
            {Object.entries(specializationLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {(query || status !== "all" || specialization !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setSpecialization("all");
              }}
            >
              Сбросить фильтры
            </Button>
          )}
        </div>
        <p className="people-count" role="status">
          Найдено людей: {visible.length} / {people.length}
        </p>
        {!ready && <Skeleton className="h-24 w-full" />}
        <ul className="people-list" aria-label="Локальные профили">
          {visible.map((p) => (
            <li key={p.id}>
              <div>
                <Link className="person-name" href={`/activists/${p.id}`}>
                  {p.displayName}
                </Link>
                <small className="person-identity">
                  ID {p.id.slice(0, 8)} · {membershipLabels[p.membershipStatus]}
                </small>
              </div>
              <p>
                {[
                  p.role,
                  ...p.specializations.map((s) => specializationLabels[s]),
                ]
                  .filter(Boolean)
                  .join(" · ") || "Роль не указана"}
              </p>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/activists/${p.id}`}>Профиль и задания</Link>
              </Button>
            </li>
          ))}
        </ul>
        {ready && !visible.length && (
          <p className="people-empty">
            {people.length
              ? "Нет людей по выбранным условиям. Измените запрос или сбросьте фильтры."
              : "Справочник пока пуст. Добавьте первого кандидата или активиста."}
          </p>
        )}
        <p className="people-footnote">
          Одинаковые имена могут принадлежать разным людям. Проверяйте ID и роль
          перед назначением. Удаление профилей не используется: для сохранения
          истории выбирайте «Неактивен».
        </p>
        <LegacyReview people={people} />
      </main>
      {adding && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setAdding(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить человека</DialogTitle>
              <DialogDescription>
                Новый человек — отдельный профиль. Совпадающие имена не
                объединяются.
              </DialogDescription>
            </DialogHeader>
            <PersonForm
              onCancel={() => setAdding(false)}
              onSaved={(p) => router.push(`/activists/${p.id}`)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
