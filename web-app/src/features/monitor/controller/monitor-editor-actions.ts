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

import type { NavigateFunction } from 'react-router-dom';

import { normalizeMonitorScrape, type MonitorEditorMode } from '../api/monitor-contract';
import type {
  MonitorEditorDraft,
  MonitorParamFormValue
} from '../model/monitor-editor-model';

type DraftUpdater = (updater: (value: MonitorEditorDraft) => MonitorEditorDraft) => void;

type MonitorEditorActionsInput = {
  mode: MonitorEditorMode;
  id: number | undefined;
  app: string;
  draft: MonitorEditorDraft | undefined;
  searchParams: URLSearchParams;
  pathname: string;
  navigate: NavigateFunction;
  updateDraft: DraftUpdater;
  prepareTransition: (target: string) => void;
  detect: () => Promise<void>;
  save: () => Promise<void>;
  cancel: () => void;
  retry: () => Promise<void>;
};

export function createMonitorEditorActions(input: MonitorEditorActionsInput) {
  return {
    updateMonitor: (patch: Partial<MonitorEditorDraft['monitor']>) => input.updateDraft(current => ({
      ...current,
      monitor: { ...current.monitor, ...patch }
    })),
    updateCollector: (collector: string) => input.updateDraft(current => ({ ...current, collector })),
    updateGrafana: (patch: Partial<MonitorEditorDraft['grafanaDashboard']>) => input.updateDraft(current => ({
      ...current,
      grafanaDashboard: { ...current.grafanaDashboard, ...patch }
    })),
    updateParam: (field: string, value: MonitorParamFormValue) => input.updateDraft(current => ({
      ...current,
      params: current.params.map(param => param.field === field
        ? { ...param, paramValue: value }
        : param)
    })),
    setParamValid: (field: string, valid: boolean) => input.updateDraft(current => ({
      ...current,
      invalidParamFields: valid
        ? current.invalidParamFields.filter(item => item !== field)
        : [...new Set([...current.invalidParamFields, field])]
    })),
    changeSource: (next: { app?: string; scrape?: string }) => changeMonitorEditorSource(input, next),
    detect: input.detect,
    save: input.save,
    cancel: input.cancel,
    retry: input.retry
  };
}

function changeMonitorEditorSource(
  input: MonitorEditorActionsInput,
  next: { app?: string; scrape?: string }
) {
  const params = new URLSearchParams(input.searchParams);
  if (next.app !== undefined) params.set('app', next.app);
  if (next.scrape !== undefined) params.set('scrape', normalizeMonitorScrape(next.scrape));
  if (input.draft && next.app === undefined && next.scrape !== undefined) {
    const target = `${input.mode}:${input.id ?? 'new'}:${input.app}:${normalizeMonitorScrape(next.scrape)}`;
    input.prepareTransition(target);
  }
  void input.navigate(`${input.pathname}?${params.toString()}`);
}
