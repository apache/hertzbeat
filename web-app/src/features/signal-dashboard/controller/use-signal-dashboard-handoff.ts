/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { readDashboardPanelHandoff, type IncomingDashboardPanel } from '../model/signal-dashboard-handoff';

export function useSignalDashboardHandoff(scope: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const consumed = useRef<string>();
  const [state, setState] = useState<{ scope: string; incoming: IncomingDashboardPanel | undefined; invalid: boolean }>(
    { scope, incoming: undefined, invalid: false }
  );
  useEffect(() => {
    const value: unknown = location.state;
    if (!value || typeof value !== 'object' || !('dashboardPanelHandoff' in value) || consumed.current === location.key)
      return;
    consumed.current = location.key;
    const incoming = readDashboardPanelHandoff(value.dashboardPanelHandoff);
    setState({ scope, incoming, invalid: !incoming });
    void navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null }
    );
  }, [location, navigate, scope]);
  return {
    incoming: state.scope === scope ? state.incoming : undefined,
    error: state.scope === scope && state.invalid ? 'invalidHandoff' : undefined,
    dismiss: () => setState({ scope, incoming: undefined, invalid: false })
  };
}
