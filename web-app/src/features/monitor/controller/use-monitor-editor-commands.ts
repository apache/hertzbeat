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

import { useEffect, useRef, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';

import {
  detectMonitor,
  loadMonitorDetail,
  loadNewMonitorEvidence,
  saveMonitor,
  type MonitorDetail,
  type MonitorParamDefine
} from '../api/monitor-api';
import type { MonitorEditorMode } from '../api/monitor-contract';
import { monitorWritableConverged } from '../model/monitor-editor-convergence';
import { buildMonitorPayload } from '../model/monitor-editor-payload';
import {
  MonitorParamDraftError,
  type MonitorEditorDraft
} from '../model/monitor-editor-model';
import { validateMonitorEditorDraft } from '../model/monitor-editor-validation';
import {
  createMonitorEditorOperation,
  isCurrentMonitorEditorOperation,
  type MonitorEditorActiveOperation
} from './monitor-editor-command-operation';

type CommandText = {
  validation: string;
  detectSuccess: string;
  detectFailed: string;
  saveSuccess: string;
  saveFailed: string;
};

type MessageApi = {
  warning: (text: string) => unknown;
  success: (text: string) => unknown;
  error: (text: string) => unknown;
};

type CommandInput = {
  mode: MonitorEditorMode;
  id: number | undefined;
  source: string;
  draft: MonitorEditorDraft | undefined;
  before: MonitorDetail | undefined;
  defines: MonitorParamDefine[];
  returnTo: string;
  navigate: NavigateFunction;
  message: MessageApi;
  text: CommandText;
};

type CommandState = {
  source: string;
  command: 'idle' | 'detecting' | 'saving';
  showValidation: boolean;
};

type CommandAction = 'detect' | 'save';

type PreparedCommand = {
  active: MonitorEditorActiveOperation;
  payload: ReturnType<typeof buildMonitorPayload>;
};

export function useMonitorEditorCommands(input: CommandInput) {
  const operation = useRef<MonitorEditorActiveOperation | null>(null);
  const [state, setState] = useState<CommandState>({
    source: input.source,
    command: 'idle',
    showValidation: false
  });

  useEffect(() => {
    const active = operation.current;
    if (active && active.source !== input.source) {
      // Commands belong to one source snapshot. Abort and detach before a new
      // source can start so late completion cannot notify or navigate.
      active.controller.abort();
      operation.current = null;
      setState({ source: input.source, command: 'idle', showValidation: false });
    }
  }, [input.source]);

  useEffect(() => () => {
    operation.current?.controller.abort();
  }, []);

  const run = (action: 'detect' | 'save') => executeMonitorCommand(
    action,
    input,
    operation,
    setState
  );

  return {
    command: state.source === input.source ? state.command : 'idle',
    validationIssues: state.source === input.source && state.showValidation && input.draft
      ? validateMonitorEditorDraft(input.draft, input.defines)
      : [],
    detect: () => run('detect'),
    save: () => run('save'),
    cancel: () => {
      operation.current?.controller.abort();
      void input.navigate(input.returnTo);
    }
  };
}

async function executeMonitorCommand(
  action: CommandAction,
  input: CommandInput,
  operation: React.MutableRefObject<MonitorEditorActiveOperation | null>,
  setState: React.Dispatch<React.SetStateAction<CommandState>>
) {
  // Detect and save share one mutex. A second command never observes or
  // overwrites the payload snapshot owned by the active command.
  const prepared = prepareMonitorCommand(action, input, operation, setState);
  if (!prepared) return;
  const { active, payload } = prepared;

  try {
    await runMonitorCommand(action, input, payload, active.controller.signal);
    completeMonitorCommand(action, input, operation.current, active);
  } catch {
    failMonitorCommand(action, input, operation.current, active);
  } finally {
    releaseMonitorCommand(input.source, operation, setState, active);
  }
}

function prepareMonitorCommand(
  action: CommandAction,
  input: CommandInput,
  operation: React.MutableRefObject<MonitorEditorActiveOperation | null>,
  setState: React.Dispatch<React.SetStateAction<CommandState>>
): PreparedCommand | undefined {
  if (!input.draft || operation.current) return undefined;
  if (validateMonitorEditorDraft(input.draft, input.defines).length > 0) {
    setState({ source: input.source, command: 'idle', showValidation: true });
    void input.message.warning(input.text.validation);
    return undefined;
  }
  const active = createMonitorEditorOperation(input.source);
  operation.current = active;
  setState({
    source: input.source,
    command: action === 'detect' ? 'detecting' : 'saving',
    showValidation: false
  });
  return {
    active,
    payload: buildMonitorPayload(
      input.draft.monitor,
      input.draft.collector,
      input.draft.params,
      input.defines,
      input.draft.grafanaDashboard
    )
  };
}

async function runMonitorCommand(
  action: CommandAction,
  input: CommandInput,
  payload: ReturnType<typeof buildMonitorPayload>,
  signal: AbortSignal
) {
  if (action === 'detect') await detectMonitor(payload, signal);
  else await saveAndProve(input, payload, signal);
}

function completeMonitorCommand(
  action: CommandAction,
  input: CommandInput,
  current: MonitorEditorActiveOperation | null,
  active: MonitorEditorActiveOperation
) {
  if (!isCurrentMonitorEditorOperation(current, active) || active.controller.signal.aborted) return;
  void input.message.success(action === 'detect' ? input.text.detectSuccess : input.text.saveSuccess);
  if (action === 'save') navigateAfterSave(input);
}

function failMonitorCommand(
  action: CommandAction,
  input: CommandInput,
  current: MonitorEditorActiveOperation | null,
  active: MonitorEditorActiveOperation
) {
  if (!isCurrentMonitorEditorOperation(current, active) || active.controller.signal.aborted) return;
  void input.message.error(action === 'detect' ? input.text.detectFailed : input.text.saveFailed);
}

function releaseMonitorCommand(
  source: string,
  operation: React.MutableRefObject<MonitorEditorActiveOperation | null>,
  setState: React.Dispatch<React.SetStateAction<CommandState>>,
  active: MonitorEditorActiveOperation
) {
  if (operation.current?.token !== active.token) return;
  operation.current = null;
  setState({ source, command: 'idle', showValidation: false });
}

async function saveAndProve(
  input: CommandInput,
  payload: ReturnType<typeof buildMonitorPayload>,
  signal: AbortSignal
) {
  await saveMonitor(input.mode, payload, signal);
  const proof = input.mode === 'edit'
    ? await loadMonitorDetail(input.id!, signal)
    : await loadNewMonitorEvidence(payload.monitor.name ?? '', payload.monitor.app ?? '', signal);
  if (!monitorWritableConverged(input.mode, payload, proof, input.defines, input.before)) {
    throw new MonitorParamDraftError('convergence');
  }
}

function navigateAfterSave(input: CommandInput) {
  if (!input.draft) return;
  const target = input.mode === 'edit'
    ? input.returnTo
    : `/monitors?app=${encodeURIComponent(input.draft.monitor.app)}`;
  void input.navigate(target);
}
