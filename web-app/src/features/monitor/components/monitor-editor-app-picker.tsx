/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useMemo, useState } from 'react';

import type { MonitorApp } from '../model/monitor-contract';
import { buildMonitorAppPickerGroups } from '../model/monitor-app-picker-model';
import { MonitorAppPickerDialog } from './monitor-app-picker-dialog';

type MonitorEditorAppPickerProps = {
  apps: MonitorApp[];
  open?: boolean;
  onCancel: () => void;
  onSelect: (app: string) => void;
};

/**
 * Keeps every untyped monitor entry point on the same searchable catalog.
 * The route remains open behind the dialog so Cancel can honor its returnTo.
 */
export function MonitorEditorAppPicker({ apps, open = true, onCancel, onSelect }: MonitorEditorAppPickerProps) {
  const [search, setSearch] = useState('');
  const evidence = useMemo(() => ({ kind: 'ready' as const, groups: buildMonitorAppPickerGroups(apps) }), [apps]);

  return (
    <MonitorAppPickerDialog
      open={open}
      search={search}
      evidence={evidence}
      onSearch={setSearch}
      onCancel={onCancel}
      onSelect={onSelect}
    />
  );
}
