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

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import { detectMonitor } from '../api/monitor-api';
import { classifyMonitorEditorCommandFailure } from '../api/monitor-editor-api-failure';
import { buildMonitorPayload } from '../model/monitor-editor-payload';
import type { MonitorEditorCommandFeedback } from '../model/monitor-editor-model';
import { validateMonitorEditorDraft } from '../model/monitor-editor-validation';
import {
  createMonitorEditorOperation,
  isCurrentMonitorEditorOperation,
  type MonitorEditorActiveOperation
} from './monitor-editor-command-operation';
import type {
  MonitorEditorCommandInput as CommandInput,
  MonitorEditorCommandRequest
} from './monitor-editor-command-model';
import { completeAcknowledgedMonitorSave } from './monitor-editor-save-completion';
import { saveAcknowledgedMonitor } from './monitor-editor-save';

type CommandState = {
  source: string;
  command: 'idle' | 'detecting' | 'saving';
  feedback: MonitorEditorCommandFeedback | null;
  showValidation: boolean;
};

type CommandAction = 'detect' | 'save';

type PreparedCommand = {
  active: MonitorEditorActiveOperation;
  payload: ReturnType<typeof buildMonitorPayload>;
};

export function useMonitorEditorCommands(request: MonitorEditorCommandRequest) {
  const input: CommandInput = { ...request, queryClient: useQueryClient() };
  const operation = useRef<MonitorEditorActiveOperation | null>(null);
  const [state, setState] = useState<CommandState>({
    source: input.source,
    command: 'idle',
    feedback: null,
    showValidation: false
  });
  if (state.source !== input.source) {
    // Retire feedback during render so a browser A → B → A transition cannot
    // reveal an earlier source snapshot while waiting for an effect.
    setState({ source: input.source, command: 'idle', feedback: null, showValidation: false });
  }

  useEffect(() => {
    const active = operation.current;
    if (active && active.source !== input.source) {
      // Commands belong to one source snapshot. Abort and detach before a new
      // source can start so late completion cannot notify or navigate.
      active.controller.abort();
      operation.current = null;
    }
  }, [input.source]);

  useEffect(
    () => () => {
      const active = operation.current;
      operation.current = null;
      active?.controller.abort();
    },
    []
  );

  const run = (action: 'detect' | 'save') => executeMonitorCommand(action, input, operation, setState);

  return {
    command: state.source === input.source ? state.command : 'idle',
    feedback: state.source === input.source ? state.feedback : null,
    isLocked: () => operation.current !== null,
    clearFeedback: () => clearMonitorCommandFeedback(input.source, setState),
    validationIssues:
      state.source === input.source && state.showValidation && input.draft
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
    if (completeMonitorCommand(action, input, operation.current, active) && action === 'detect') {
      publishMonitorCommandFeedback(input.source, 'detect-success', setState);
    }
  } catch (error) {
    const feedback = failMonitorCommand(action, error, input, operation.current, active);
    if (feedback) publishMonitorCommandFeedback(input.source, feedback, setState);
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
    setState({ source: input.source, command: 'idle', feedback: null, showValidation: true });
    void input.message.warning(input.text.validation);
    return undefined;
  }
  const active = createMonitorEditorOperation(input.source);
  operation.current = active;
  setState({
    source: input.source,
    command: action === 'detect' ? 'detecting' : 'saving',
    feedback: null,
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
  if (action === 'detect') {
    await detectMonitor(payload, signal);
    return;
  }
  await saveAcknowledgedMonitor(input, payload, signal);
}

function completeMonitorCommand(
  action: CommandAction,
  input: CommandInput,
  current: MonitorEditorActiveOperation | null,
  active: MonitorEditorActiveOperation
) {
  if (!isCurrentMonitorEditorOperation(current, active) || active.controller.signal.aborted) return false;
  if (action === 'detect') {
    void input.message.success(input.text.detectSuccess);
    return true;
  }
  completeAcknowledgedMonitorSave(input);
  return true;
}

function failMonitorCommand(
  action: CommandAction,
  error: unknown,
  input: CommandInput,
  current: MonitorEditorActiveOperation | null,
  active: MonitorEditorActiveOperation
) {
  if (!isCurrentMonitorEditorOperation(current, active) || active.controller.signal.aborted) return null;
  if (action === 'save' && isUncertainMonitorSave(error)) {
    void input.message.warning(input.text.saveUnknown);
    return 'save-unknown' as const;
  }
  void input.message.error(action === 'detect' ? input.text.detectFailed : input.text.saveFailed);
  return {
    kind: 'failure' as const,
    action,
    failure: classifyMonitorEditorCommandFailure(error)
  };
}

function isUncertainMonitorSave(error: unknown) {
  return error instanceof ApiMessageError && apiMessageWriteOutcome(error) === 'uncertain';
}

function releaseMonitorCommand(
  source: string,
  operation: React.MutableRefObject<MonitorEditorActiveOperation | null>,
  setState: React.Dispatch<React.SetStateAction<CommandState>>,
  active: MonitorEditorActiveOperation
) {
  if (operation.current?.token !== active.token) return;
  operation.current = null;
  setState(current => (current.source === source ? { ...current, command: 'idle', showValidation: false } : current));
}

function publishMonitorCommandFeedback(
  source: string,
  feedback: MonitorEditorCommandFeedback,
  setState: React.Dispatch<React.SetStateAction<CommandState>>
) {
  setState(current => (current.source === source ? { ...current, feedback } : current));
}

function clearMonitorCommandFeedback(source: string, setState: React.Dispatch<React.SetStateAction<CommandState>>) {
  setState(current =>
    current.source === source && current.feedback !== null ? { ...current, feedback: null } : current
  );
}
