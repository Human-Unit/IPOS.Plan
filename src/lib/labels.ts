export const statusLabels = {
  todo: "К выполнению",
  in_progress: "В работе",
  review: "На проверке",
  done: "Готово",
  cancelled: "Отменено",
};
export const priorityLabels = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Не удалось выполнить действие";
}
