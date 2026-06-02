'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { buildLoginRedirectHref, buildLoginReturnTo } from '@/lib/passport-login/controller';
import { hasClientSessionMarker, readClientSessionState } from '@/lib/session-client';

function shouldOptimisticallyRenderProtectedRoute(pathname: string) {
  return pathname === '/topology' || pathname.startsWith('/topology/');
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const optimisticRender = shouldOptimisticallyRenderProtectedRoute(pathname) && hasClientSessionMarker();
  const [ready, setReady] = useState(optimisticRender);
  const [authed, setAuthed] = useState(optimisticRender);

  useEffect(() => {
    let cancelled = false;
    readClientSessionState().then(session => {
      if (cancelled) return;
      setAuthed(session.authenticated);
      setReady(true);
      if (!session.authenticated) {
        const returnTo = buildLoginReturnTo(window.location);
        window.location.href = buildLoginRedirectHref(returnTo, process.env.NEXT_PUBLIC_LOGIN_PATH);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !authed) {
    return null;
  }

  return <>{children}</>;
}
