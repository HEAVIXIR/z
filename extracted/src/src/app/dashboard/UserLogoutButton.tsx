"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

/* User-side logout. Clears the USER session cookie via the
   existing /api/auth/logout route (the admin logout also works
   but this one is scoped to the user session). */

export default function UserLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-4 text-xs font-bold text-white/70 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-3.5 w-3.5" />
      )}
      خروج
    </button>
  );
}
