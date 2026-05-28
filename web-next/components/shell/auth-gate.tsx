'use client';

import { useEffect, useState } from 'react';
import { buildLoginRedirectHref, buildLoginReturnTo } from '@/lib/passport-login/controller';
import { readClientSessionState } from '@/lib/session-client';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

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
