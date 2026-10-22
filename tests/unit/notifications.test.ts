import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({
  success: vi.fn(() => "new-success"),
  error: vi.fn(() => "error"),
  warning: vi.fn(() => "warning"),
  dismiss: vi.fn(),
  getToasts: vi.fn<() => { id: string; type: string }[]>(() => []),
}));
vi.mock("sonner", () => ({ toast: mocked }));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocked.getToasts.mockReturnValue([]);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());
it("deduplicates identical successes for two seconds without repeated announcements", async () => {
  const { toast } = await import("@/lib/notifications");
  toast.success("Версия сохранена");
  toast.success("Версия сохранена");
  expect(mocked.success).toHaveBeenCalledTimes(1);
  expect(mocked.success).toHaveBeenCalledWith("Версия сохранена", {
    duration: 2000,
    closeButton: false,
  });
  vi.advanceTimersByTime(2001);
  toast.success("Версия сохранена");
  expect(mocked.success).toHaveBeenCalledTimes(2);
});
it("replaces routine confirmations and lets problems take priority", async () => {
  const { toast } = await import("@/lib/notifications");
  mocked.getToasts.mockReturnValue([{ id: "old", type: "success" }]);
  toast.success("JSON скопирован");
  expect(mocked.dismiss).toHaveBeenCalledWith("old");
  toast.error("Не удалось сохранить");
  expect(mocked.error).toHaveBeenCalledWith("Не удалось сохранить", {
    duration: 10000,
    closeButton: true,
  });
  mocked.getToasts.mockReturnValue([{ id: "error", type: "error" }]);
  toast.success("DOCX подготовлен");
  expect(mocked.success).toHaveBeenCalledTimes(1);
});
it("keeps warnings readable and allows longer explanatory successes", async () => {
  const { toast } = await import("@/lib/notifications");
  toast.warning("Внешнее изображение может быть недоступно");
  expect(mocked.warning).toHaveBeenCalledWith(
    "Внешнее изображение может быть недоступно",
    { duration: 8000, closeButton: true },
  );
  mocked.getToasts.mockReturnValue([{ id: "warning", type: "warning" }]);
  toast.success("Версия сохранена");
  expect(mocked.success).not.toHaveBeenCalled();
  mocked.getToasts.mockReturnValue([]);
  toast.success("Сохранена уменьшенная копия. Оригинал храните отдельно.", {
    duration: 6000,
  });
  expect(mocked.success).toHaveBeenCalledWith(expect.any(String), {
    duration: 6000,
    closeButton: false,
  });
});
