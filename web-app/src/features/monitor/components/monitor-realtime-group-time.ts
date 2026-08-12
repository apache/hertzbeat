/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';

export function formatGroupTime(evidence: MonitorMetricWorkbenchController['state']['realtime']) {
  if (evidence.kind !== 'ready' && evidence.kind !== 'loading') return '—';
  const values = evidence.rows.flatMap(row =>
    (row.collectedAt ?? row.time) == null ? [] : [row.collectedAt ?? row.time!]
  );
  const latest = values.length > 0 ? Math.max(...values) : undefined;
  return latest == null ? '—' : new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(latest);
}
