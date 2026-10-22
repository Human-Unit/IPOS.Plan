import { toast as sonner, type ExternalToast } from "sonner";

export const notificationDuration = {
  success: 2000,
  warning: 8000,
  error: 10000,
} as const;
let lastSuccess:
  { message: string; at: number; id: string | number } | undefined;
const dismissSuccesses = () => {
  for (const item of sonner.getToasts())
    if ("type" in item && item.type === "success") sonner.dismiss(item.id);
};

/** One routine confirmation at a time; a confirmation never displaces an active problem. */
export const toast = {
  success(message: string, options?: ExternalToast) {
    if (
      sonner
        .getToasts()
        .some(
          (item) =>
            "type" in item &&
            (item.type === "error" || item.type === "warning"),
        )
    )
      return;
    const at = Date.now();
    if (
      lastSuccess?.message === message &&
      at - lastSuccess.at < notificationDuration.success
    )
      return lastSuccess.id;
    dismissSuccesses();
    const id = sonner.success(message, {
      duration: notificationDuration.success,
      closeButton: false,
      ...options,
    });
    lastSuccess = { message, at, id };
    return id;
  },
  warning(message: string, options?: ExternalToast) {
    dismissSuccesses();
    return sonner.warning(message, {
      duration: notificationDuration.warning,
      closeButton: true,
      ...options,
    });
  },
  error(message: string, options?: ExternalToast) {
    dismissSuccesses();
    return sonner.error(message, {
      duration: notificationDuration.error,
      closeButton: true,
      ...options,
    });
  },
};
