import { flushSync } from "react-dom";
import { motionTiming } from "./motion";

export type ThemePreference = "light" | "dark";
let active: ViewTransition | undefined;
let activeAnimation: Animation | undefined;
let request = 0;

/** A gently rippled circular reveal. Every frame has the same vertex count. */
export function radialWave(x: number, y: number, radius: number) {
  return `polygon(${Array.from({ length: 64 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    const organic =
      1 + 0.032 * Math.sin(3 * angle + 0.6) + 0.016 * Math.sin(5 * angle);
    return `${(x + Math.cos(angle) * radius * organic).toFixed(2)}px ${(y + Math.sin(angle) * radius * organic).toFixed(2)}px`;
  }).join(",")})`;
}

// next-themes updates html.className from an effect. Wait until the class
// actually changes, so the new View Transition snapshot contains the new
// theme. The timeout only guards a suspended background render.
async function commitTheme(
  setTheme: (theme: string) => void,
  preference: ThemePreference,
) {
  const root = document.documentElement;
  await new Promise<void>((resolve) => {
    const done = () => {
      observer.disconnect();
      clearTimeout(timeout);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (root.classList.contains(preference)) done();
    });
    const timeout = window.setTimeout(done, 200);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    flushSync(() => setTheme(preference));
    if (root.classList.contains(preference)) done();
  });
}

export async function changeTheme(
  preference: ThemePreference,
  setTheme: (theme: string) => void,
  trigger: HTMLElement,
) {
  const serial = ++request;
  // Cancel a stale transition before starting a fresh reveal. Its finally
  // handler must not remove the newer transition's CSS masking state.
  active?.skipTransition();
  activeAnimation?.cancel();
  activeAnimation = undefined;
  active = undefined;

  const root = document.documentElement;
  const apply = () => commitTheme(setTheme, preference);
  if (
    !document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.visibilityState !== "visible" ||
    root.classList.contains(preference)
  ) {
    await apply();
    return;
  }

  const rect = trigger.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  // A little overshoot prevents irregular edges from exposing an old corner.
  const radius =
    Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) *
    1.08;
  const startingClip = radialWave(x, y, 0);
  const endingClip = radialWave(x, y, radius);

  // Critical: mask the incoming snapshot *before* transition.ready. Without
  // this initial CSS clip, the new theme can flash fully onscreen for a frame
  // before Web Animations begins.
  root.style.setProperty("--theme-wave-start", startingClip);
  root.dataset.themeWave = "active";
  let transition: ViewTransition | undefined;
  let animation: Animation | undefined;
  try {
    transition = document.startViewTransition(async () => {
      if (serial !== request) return;
      await apply();
      if (!root.classList.contains(preference))
        throw new Error("Theme commit deferred");
    });
    active = transition;
    // A skipped View Transition rejects ready; prevent abandoned rejections.
    void transition.ready.catch(() => {});
    void transition.finished.catch(() => {});
    void transition.updateCallbackDone.catch(() => {});
    await transition.ready;
    if (serial !== request) return;

    // Two compatible polygon frames + one global easing curve produce one
    // continuous expansion (rather than visible acceleration at each waypoint).
    animation = root.animate(
      [{ clipPath: startingClip }, { clipPath: endingClip }],
      {
        duration: motionTiming.wave,
        easing: "cubic-bezier(0.22, 0.68, 0.22, 1)",
        fill: "both",
        pseudoElement: "::view-transition-new(root)",
      },
    );
    activeAnimation = animation;
    await Promise.allSettled([animation.finished, transition.finished]);
  } catch {
    // If the browser supports View Transitions but not animated pseudo-element
    // clipping, finish the theme change normally instead of freezing the page.
    transition?.skipTransition();
    if (serial === request) await apply();
  } finally {
    if (serial === request) {
      root.removeAttribute("data-theme-wave");
      root.style.removeProperty("--theme-wave-start");
    }
    animation?.cancel();
    if (activeAnimation === animation) activeAnimation = undefined;
    if (active === transition) active = undefined;
  }
}
