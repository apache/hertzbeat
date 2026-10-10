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

import { buildMonitorListPath } from '@/shared/navigation/app-paths';

import type { MonitorEditorCommandInput } from './monitor-editor-command-model';
import { monitorQueryKeys } from './monitor-query-keys';

/** Marks every cache affected by a successful write stale without racing the explicit proof read. */
export function markAcknowledgedMonitorSave(input: MonitorEditorCommandInput) {
  void input.queryClient.invalidateQueries({ queryKey: monitorQueryKeys.lists(), refetchType: 'none' });
  if (input.mode === 'edit' && input.id !== undefined) {
    void input.queryClient.invalidateQueries({
      queryKey: monitorQueryKeys.detail(input.id),
      exact: true,
      refetchType: 'none'
    });
  }
}

/** Reports and navigates after the write endpoint has acknowledged the save. */
export function completeAcknowledgedMonitorSave(input: MonitorEditorCommandInput) {
  void input.message.success(input.text.saveSuccess);
  if (!input.draft) return;
  const target = input.mode === 'edit' ? input.returnTo : buildMonitorListPath({ app: input.draft.monitor.app });
  input.saved?.();
  void input.navigate(target);
}
