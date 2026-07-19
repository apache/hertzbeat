/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { MonitorApp, MonitorCollector, MonitorParamDefine } from '../model/monitor-contract';
import type { MonitorEditorDraft, MonitorParamFormValue } from '../model/monitor-editor-model';

export type MonitorEditorFormController = {
  state: {
    evidence: { kind: 'loading' | 'missing' | 'invalid' | 'unavailable' | 'error' | 'ready' };
    draft: MonitorEditorDraft | undefined;
    defines: MonitorParamDefine[];
    apps: MonitorApp[];
    collectors: MonitorCollector[];
    busy: boolean;
    command: 'idle' | 'detecting' | 'saving';
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
