"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSessionMeApi, type SessionMeResponse } from "@/shared/infrastructure/animals/animals-api";

type SessionContextValue = {
  session: SessionMeResponse | null;
  loading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const HARAS_PATH = "/dashboard/haras";

export function DashboardSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    setError(null);
    try {
      const data = await getSessionMeApi();
      setSession(data);
    } catch (e) {
      setSession(null);
      setError(e instanceof Error ? e.message : "Sessão indisponível");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (loading || !session) return;
    const isOwnerProfile = session.user?.profileCode === "owner";
    const done = session.owner?.harasSetupCompleted === true;
    if (isOwnerProfile && !done && pathname !== HARAS_PATH) {
      router.replace(HARAS_PATH);
    }
  }, [loading, session, pathname, router]);

  const value = useMemo(
    () => ({ session, loading, error, refreshSession }),
    [session, loading, error, refreshSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useDashboardSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useDashboardSession must be used within DashboardSessionProvider");
  }
  return ctx;
}
