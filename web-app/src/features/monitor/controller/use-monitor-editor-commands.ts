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

import { detectMonitor } from '../api/monitor-api';
import type { MonitorDetail } from '../model/monitor-contract';
import { buildMonitorPayload } from '../model/monitor-editor-payload';
import { validateMonitorEditorDraft } from '../model/monitor-editor-validation';
import { verifiedMonitorWrite, type MonitorWriteVerification } from '../model/monitor-write-verification';
import {
  createMonitorEditorOperation,
  isCurrentMonitorEditorOperation,
  type MonitorEditorActiveOperation
} from './monitor-editor-command-operation';
import type {
  MonitorEditorCommandInput as CommandInput,
  MonitorEditorCommandRequest
} from './monitor-editor-command-model';
import { completeCommittedMonitorSave } from './monitor-editor-save-completion';
import { saveAndVerifyMonitor } from './monitor-editor-save-verification';

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

export function useMonitorEditorCommands(request: MonitorEditorCommandRequest) {
  const input: CommandInput = { ...request, queryClient: useQueryClient() };
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
    isLocked: () => operation.current !== null,
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
    const verification = await runMonitorCommand(action, input, payload, active.controller.signal, () =>
      isCurrentMonitorEditorOperation(operation.current, active)
    );
    if (!verification) return;
    completeMonitorCommand(action, verification, input, operation.current, active);
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
  signal: AbortSignal,
  ownsOperation: () => boolean
) {
  if (action === 'detect') {
    await detectMonitor(payload, signal);
    return verifiedMonitorWrite(undefined);
  }
  return saveAndVerifyMonitor(input, payload, signal, ownsOperation);
}

function completeMonitorCommand(
  action: CommandAction,
  verification: MonitorWriteVerification<MonitorDetail | undefined>,
  input: CommandInput,
  current: MonitorEditorActiveOperation | null,
  active: MonitorEditorActiveOperation
) {
  if (!isCurrentMonitorEditorOperation(current, active) || active.controller.signal.aborted) return;
  if (action === 'detect') {
    void input.message.success(input.text.detectSuccess);
    return;
  }
  completeCommittedMonitorSave(verification, input);
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
