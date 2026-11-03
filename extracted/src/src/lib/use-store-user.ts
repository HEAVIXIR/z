"use client";

import { useEffect, useState } from "react";

/**
 * HEAVIX store — client hook that fetches the currently-logged-in
 * HEAVIX user (via /api/auth/me) and exposes a stable { user, loading }
 * tuple. Used by the store UI to:
 *   - prefill the checkout form from the HEAVIX profile
 *   - show a "ورود به هویکس" prompt when not logged in
 *   - fetch the user's order history by userId instead of phone
 *
 * This is the bridge that makes the store feel like part of HEAVIX
 * (one login, one profile) without coupling the store bundle to the
 * HEAVIX layout/components.
 */

export interface StoreUserClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
  status: string;
  emailVerified: boolean;
  mobileVerified: boolean;
}

interface State {
  user: StoreUserClient | null;
  loading: boolean;
  /** Force a re-fetch (e.g. after a successful login). */
  refresh: () => void;
}

export function useStoreUser(): State {
  const [user, setUser] = useState<StoreUserClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        if (d && d.ok && d.user) {
          setUser(d.user as StoreUserClient);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { user, loading, refresh: () => setNonce((n) => n + 1) };
}
