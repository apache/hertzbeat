/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useLocation, useNavigate } from 'react-router-dom';

import type { MonitorCapabilities } from '../model/monitor-capability-model';
import { buildMonitorCreatePath, buildMonitorRoutePath, type MonitorQuery } from '../model/monitor-model';

export function useMonitorListNavigation(query: MonitorQuery, capabilities: Pick<MonitorCapabilities, 'canWrite'>) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTarget = `${location.pathname}${location.search}`;
  return {
    create: () => {
      if (!capabilities.canWrite) return;
      void navigate(buildMonitorCreatePath(query.app, returnTarget));
    },
    open: (id: number, mode: 'view' | 'edit') => {
      if (mode === 'edit' && !capabilities.canWrite) return;
      void navigate(buildMonitorRoutePath(id, mode, returnTarget));
    }
  };
}
