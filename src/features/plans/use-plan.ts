"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/db/database";
import type { Plan, PortablePlan } from "@/lib/schema/plan";
import { replacePlan, savePlan } from "./repository";
import { errorMessage } from "@/lib/labels";
export function usePlan(id: string) {
  const [plan, setPlan] = useState<Plan>();
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("Загрузка…");
  const [error, setError] = useState("");
  const current = useRef<Plan | undefined>(undefined);
  const dirty = useRef(false);
  const change = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [tick, setTick] = useState(0);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let cancelled = false;
    db.plans
      .get(id)
      .then((p) => {
        if (!cancelled) {
          current.current = p;
          setPlan(p);
          setLoaded(true);
          setStatus("Сохранено локально");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(errorMessage(e));
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const update = useCallback((fn: (p: Plan) => Plan) => {
    if (!current.current) return;
    const next = fn(current.current);
    current.current = next;
    dirty.current = true;
    change.current++;
    setPlan(next);
    setStatus("Есть изменения…");
    setTick((t) => t + 1);
  }, []);
  const flush = useCallback((): Promise<Plan> => {
    const work = queue.current
      .catch(() => undefined)
      .then(async () => {
        if (!current.current) throw new Error("План ещё не загружен");
        if (!dirty.current) return current.current;
        const snapshot = current.current;
        const serial = change.current;
        setStatus("Сохранение…");
        try {
          const saved = await savePlan(snapshot);
          current.current = {
            ...current.current,
            version: saved.version,
            updatedAt: saved.updatedAt,
          };
          setPlan(current.current);
          if (serial === change.current) {
            dirty.current = false;
            setStatus("Сохранено локально");
          } else setStatus("Есть изменения…");
          setError("");
          return saved;
        } catch (e) {
          setStatus("Не сохранено");
          setError(errorMessage(e));
          throw e;
        }
      });
    queue.current = work;
    return work;
  }, []);
  useEffect(() => {
    if (!tick) return;
    const timer = setTimeout(() => {
      void flush().catch(() => undefined);
    }, 700);
    return () => clearTimeout(timer);
  }, [tick, flush]);
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        void flush().catch(() => undefined);
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirty.current)
        void flush().catch(() => undefined);
    };
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);
  const replace = useCallback(
    async (data: PortablePlan, kind: "PLAN_IMPORTED" | "PLAN_RESTORED") => {
      const saved = await flush();
      const next = await replacePlan(saved, data, kind);
      current.current = next;
      dirty.current = false;
      setPlan(next);
      setGeneration((g) => g + 1);
      setStatus("Сохранено локально");
      return next;
    },
    [flush],
  );
  return { plan, loaded, status, error, update, flush, replace, generation };
}
