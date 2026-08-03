/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useMemo, useState } from 'react';

import type { MonitorApp } from '../model/monitor-contract';
import { buildMonitorAppPickerGroups } from '../model/monitor-app-picker-model';
import { MonitorAppPickerDialog } from './monitor-app-picker-dialog';

type MonitorEditorAppPickerProps = {
  apps: MonitorApp[];
  onCancel: () => void;
  onSelect: (app: string) => void;
};

/**
 * Keeps every untyped monitor entry point on the same searchable catalog.
 * The route remains open behind the dialog so Cancel can honor its returnTo.
 */
export function MonitorEditorAppPicker({ apps, onCancel, onSelect }: MonitorEditorAppPickerProps) {
  const [search, setSearch] = useState('');
  const evidence = useMemo(() => ({ kind: 'ready' as const, groups: buildMonitorAppPickerGroups(apps) }), [apps]);

  return (
    <MonitorAppPickerDialog
      open
      search={search}
      evidence={evidence}
      onSearch={setSearch}
      onCancel={onCancel}
      onSelect={onSelect}
    />
  );
}
