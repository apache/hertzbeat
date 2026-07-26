/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useLocation, useNavigate } from 'react-router-dom';

import { buildMonitorCreatePath, buildMonitorRoutePath, type MonitorQuery } from '../model/monitor-model';

export function useMonitorListNavigation(query: MonitorQuery) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTarget = `${location.pathname}${location.search}`;
  return {
    create: () => {
      void navigate(buildMonitorCreatePath(query.app, returnTarget));
    },
    open: (id: number, mode: 'view' | 'edit') => {
      void navigate(buildMonitorRoutePath(id, mode, returnTarget));
    }
  };
}
