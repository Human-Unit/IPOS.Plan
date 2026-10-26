import { flushSync } from "react-dom";
import { motionTiming } from "./motion";

export type ThemePreference = "light" | "dark";
let active: ViewTransition | undefined;
let activeAnimation: Animation | undefined;
let request = 0;

/** Slightly asymmetric wave; the polygon keeps its vertex count for interpolation. */
export function radialWave(x: number, y: number, radius: number) {
  return `polygon(${Array.from({ length: 64 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    const organic =
      1 + 0.055 * Math.sin(3 * angle + 0.6) + 0.025 * Math.sin(5 * angle);
    return `${(x + Math.cos(angle) * radius * organic).toFixed(2)}px ${(y + Math.sin(angle) * radius * organic).toFixed(2)}px`;
  }).join(",")})`;
}

// next-themes applies the class in an effect. Observe that commit, rather than
// assuming setTheme synchronously changed the snapshot. The timeout is a safety
// bound for suspended/background pages, not an animation delay.
async function commitTheme(
  setTheme: (theme: string) => void,
  preference: ThemePreference,
  effective: string,
) {
  const root = document.documentElement;
  await new Promise<void>((resolve) => {
    const done = () => {
      observer.disconnect();
      clearTimeout(timeout);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (root.classList.contains(effective)) done();
    });
    const timeout = window.setTimeout(done, 160);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    flushSync(() => setTheme(preference));
    if (root.classList.contains(effective)) done();
  });
}

export async function changeTheme(
  preference: ThemePreference,
  setTheme: (theme: string) => void,
  trigger: HTMLElement,
) {
  const serial = ++request;
  active?.skipTransition();
  activeAnimation?.cancel();
  activeAnimation = undefined;
  active = undefined;
  const root = document.documentElement;
  const effective = preference;
  const apply = () => commitTheme(setTheme, preference, effective);
  if (
    !document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.visibilityState !== "visible" ||
    root.classList.contains(effective)
  ) {
    await apply();
    return;
  }
  const rect = trigger.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius =
    Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) *
    1.12;
  let transition: ViewTransition | undefined;
  let animation: Animation | undefined;
  try {
    transition = document.startViewTransition(async () => {
      if (serial === request) {
        await apply();
        // If React deferred the effect beyond the bounded wait, skip the
        // snapshot and let next-themes finish its normal immediate update.
        if (!root.classList.contains(effective))
          throw new Error("Theme commit deferred");
      }
    });
    active = transition;
    // A skipped/unsupported snapshot must never leave an unhandled rejection.
    void transition.finished.catch(() => {});
    void transition.updateCallbackDone.catch(() => {});
    await transition.ready;
    if (serial !== request) return;
    animation = root.animate(
      [0, 0.2, 0.52, 0.8, 1].map((part) => ({
        clipPath: radialWave(x, y, radius * part),
        offset: part,
      })),
      {
        duration: motionTiming.wave,
        easing: "cubic-bezier(.22,.65,.25,1)",
        fill: "both",
        pseudoElement: "::view-transition-new(root)",
      },
    );
    activeAnimation = animation;
    // Snapshot animation is cancelled automatically if the transition is skipped.
    await Promise.allSettled([animation.finished, transition.finished]);
  } catch {
    transition?.skipTransition();
    if (serial === request) await apply();
  } finally {
    animation?.cancel();
    if (activeAnimation === animation) activeAnimation = undefined;
    if (active === transition) active = undefined;
  }
}
