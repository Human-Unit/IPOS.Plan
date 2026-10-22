"use client";
import { useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/plan/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { membershipLabels, specializationLabels } from "@/lib/schema/person";
import { usePeople } from "./people-hooks";
import { PersonForm } from "./person-form";
import { WorkloadPanel } from "./workload-panel";
import { PersonActivity } from "./person-activity";
export function PersonScreen({ id }: { id: string }) {
  const { people, ready, error } = usePeople();
  const [editing, setEditing] = useState(false);
  const person = people.find((p) => p.id === id);
  return (
    <>
      <header className="app-bar">
        <Brand />
        <Button asChild variant="ghost">
          <Link href="/activists">К активистам</Link>
        </Button>
      </header>
      <main className="people-page">
        {error && (
          <p role="alert" className="person-error">
            {error}
          </p>
        )}
        {!ready && <Skeleton className="h-24 w-full" />}
        {ready && !person && (
          <>
            <h1>Профиль не найден</h1>
            <p className="people-empty">
              Он мог остаться в другом браузере или резервной копии.
            </p>
            <Button asChild>
              <Link href="/activists">Открыть справочник</Link>
            </Button>
          </>
        )}
        {person && (
          <>
            <div className="people-heading">
              <div>
                <p className="panel-eyebrow">
                  {membershipLabels[person.membershipStatus]}
                </p>
                <h1>{person.displayName}</h1>
                <p className="muted">
                  {[
                    person.role,
                    ...person.specializations.map(
                      (s) => specializationLabels[s],
                    ),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Роль и специализации не указаны"}
                </p>
                <p className="person-identity">ID {person.id}</p>
              </div>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Редактировать профиль
              </Button>
            </div>
            {!!person.aliases.length && (
              <p className="people-note">
                Другие написания: {person.aliases.join(" · ")}
              </p>
            )}
            {!!person.notes && (
              <div className="people-note">
                <h2>Локальные заметки</h2>
                <p>{person.notes}</p>
              </div>
            )}
            <p className="people-footnote">
              Членство и заметки хранятся в этом браузере. Изменение имени
              профиля не переписывает старые тексты заданий.
            </p>
          <WorkloadPanel people={people} personId={person.id} />
          <PersonActivity personId={person.id} />
            {editing && (
              <Dialog
                open
                onOpenChange={(open) => {
                  if (!open) setEditing(false);
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Редактировать профиль</DialogTitle>
                    <DialogDescription>
                      Изменения сохранятся локально. Другие люди с тем же именем
                      останутся отдельными профилями.
                    </DialogDescription>
                  </DialogHeader>
                  <PersonForm
                    initial={person}
                    onSaved={() => setEditing(false)}
                    onCancel={() => setEditing(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </main>
    </>
  );
}
