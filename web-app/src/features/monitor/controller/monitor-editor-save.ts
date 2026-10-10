/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { saveMonitor } from '../api/monitor-api';
import type { buildMonitorPayload } from '../model/monitor-editor-payload';
import type { MonitorEditorCommandInput } from './monitor-editor-command-model';
import { markAcknowledgedMonitorSave } from './monitor-editor-save-completion';

/**
 * Persists one frozen payload and uses the successful write response as the
 * commit boundary. Query owners refresh their own caches after navigation, so
 * the editor never blocks on an additional list or detail request.
 */
export async function saveAcknowledgedMonitor(
  input: MonitorEditorCommandInput,
  payload: ReturnType<typeof buildMonitorPayload>,
  signal: AbortSignal
) {
  if (input.mode === 'edit' && input.id === undefined) {
    throw new Error('A monitor id is required when editing');
  }
  await saveMonitor(input.mode, payload, signal);
  markAcknowledgedMonitorSave(input);
}
