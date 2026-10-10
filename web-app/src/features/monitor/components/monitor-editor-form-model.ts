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

import type { LabelSuggestionCatalog } from '@/shared/labels/label-suggestion-model';

import type { MonitorApp, MonitorCollector, MonitorParamDefine } from '../model/monitor-contract';
import type {
  MonitorEditorCommandFeedback,
  MonitorEditorDraft,
  MonitorParamFormValue
} from '../model/monitor-editor-model';

export type MonitorEditorFormController = {
  state: {
    evidence: { kind: 'loading' | 'missing' | 'invalid' | 'unavailable' | 'error' | 'ready' };
    draft: MonitorEditorDraft | undefined;
    defines: MonitorParamDefine[];
    apps: MonitorApp[];
    collectors: MonitorCollector[];
    labelSuggestions: LabelSuggestionCatalog | undefined;
    busy: boolean;
    command: 'idle' | 'detecting' | 'saving';
    feedback: MonitorEditorCommandFeedback | null;
    validationIssues: string[];
    scrapeValues: readonly string[];
    sourceKey: string;
  };
  actions: {
    updateMonitor: (patch: Partial<MonitorEditorDraft['monitor']>) => void;
    updateCollector: (collector: string) => void;
    updateGrafana: (patch: Partial<MonitorEditorDraft['grafanaDashboard']>) => void;
    updateParam: (field: string, value: MonitorParamFormValue) => void;
    setParamValid: (field: string, valid: boolean) => void;
    changeSource: (next: { app?: string; scrape?: string }) => void;
    detect: () => Promise<void>;
    save: () => Promise<void>;
    cancel: () => void;
    retry: () => Promise<void>;
  };
};
