import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, type User } from './api';
import { stayFromParams } from './stay';

export function useAuth() {
  const q = useQuery<User | null>({
    queryKey: ['me'],
    queryFn: () =>
      api.me().catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return { user: q.data ?? null, loading: q.isLoading };
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="page" style={{ padding: 40 }}>Loading…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

/** Only same-site paths are followed after login, so ?next= can't redirect off the site. */
export const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

export const useStay = () => {
  const [params] = useSearchParams();
  return stayFromParams(params);
};

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const loc = useLocation();
  const list = useQuery({ queryKey: ['favorites'], queryFn: api.favorites, enabled: !!user });
  const ids = new Set(list.data?.map((p) => p.id));
  const toggle = useMutation({
    mutationFn: (id: string) => (ids.has(id) ? api.removeFavorite(id) : api.addFavorite(id)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });
  return {
    list,
    isFavorite: (id: string) => ids.has(id),
    toggle: (id: string) => {
      if (!user) nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`);
      else toggle.mutate(id);
    },
  };
}

/** Seconds since a timestamp, ticking once a second. */
export function useSecondsAgo(ts: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.round((now - ts) / 1000));
}

export function readStore<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked; these values are conveniences only.
  }
}
