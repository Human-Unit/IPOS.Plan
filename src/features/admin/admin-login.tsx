"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }), cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось войти.");
      setPassword("");
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось войти.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={e => void submit(e)} className="admin-login-form">
    <label htmlFor="admin-password">Пароль администратора</label>
    <Input id="admin-password" type="password" autoComplete="current-password"
      minLength={20} value={password} onChange={e => setPassword(e.target.value)}
      placeholder="Введите пароль" disabled={busy} required />
    {error && <p className="admin-error" role="alert">{error}</p>}
    <Button type="submit" disabled={busy || password.length < 20} size="lg">
      <LockKeyhole data-icon="inline-start" /> {busy ? "Проверяем…" : "Войти"}
    </Button>
  </form>;
}
