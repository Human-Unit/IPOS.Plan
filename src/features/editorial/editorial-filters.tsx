import { useId } from "react";
import type { Person } from "@/lib/schema/person";
import type { Plan } from "@/lib/schema/plan";
import { statuses } from "@/lib/schema/task";
import { statusLabels } from "@/lib/labels";
import type { AssignmentRow } from "@/features/activists/workload";

export const defaultEditorialFilter = { planId: "", personId: "", status: "" };
export type EditorialFilter = typeof defaultEditorialFilter;

export function editorialMatches(row: AssignmentRow, filter: EditorialFilter) {
  return (!filter.planId || row.planId === filter.planId)
    && (!filter.personId || row.personIds.includes(filter.personId))
    && (!filter.status || row.task.status === filter.status);
}

export function EditorialFilters({ plans, people, filter, onChange }: {
  plans: Plan[];
  people: Person[];
  filter: EditorialFilter;
  onChange: (filter: EditorialFilter) => void;
}) {
  const id = useId();
  return (
    <fieldset className="editorial-filters">
      <legend className="sr-only">Фильтры задач</legend>
      <div className="editorial-filter">
        <label htmlFor={id + "-planId"}>План</label>
        <select id={id + "-planId"} value={filter.planId} onChange={(event) => onChange({ ...filter, planId: event.target.value })}>
          <option value="">Все планы</option>
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
        </select>
      </div>
      <div className="editorial-filter">
        <label htmlFor={id + "-personId"}>Участник</label>
        <select id={id + "-personId"} value={filter.personId} onChange={(event) => onChange({ ...filter, personId: event.target.value })}>
          <option value="">Все участники</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}{person.role ? " · " + person.role : ""} · {person.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>
      <div className="editorial-filter">
        <label htmlFor={id + "-status"}>Статус</label>
        <select id={id + "-status"} value={filter.status} onChange={(event) => onChange({ ...filter, status: event.target.value })}>
          <option value="">Все статусы</option>
          {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
      </div>
    </fieldset>
  );
}
