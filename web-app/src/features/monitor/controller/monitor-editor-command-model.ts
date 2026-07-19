/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';

import type { MonitorDetail, MonitorEditorMode, MonitorParamDefine } from '../model/monitor-contract';
import type { MonitorEditorDraft } from '../model/monitor-editor-model';

export type MonitorEditorCommandText = {
  validation: string;
  detectSuccess: string;
  detectFailed: string;
  saveSuccess: string;
  saveFailed: string;
  verificationUnavailable: string;
  verificationError: string;
};

export type MonitorEditorCommandInput = {
  mode: MonitorEditorMode;
  id: number | undefined;
  source: string;
  draft: MonitorEditorDraft | undefined;
  before: MonitorDetail | undefined;
  defines: MonitorParamDefine[];
  returnTo: string;
  navigate: NavigateFunction;
  queryClient: QueryClient;
  message: {
    warning: (text: string) => unknown;
    success: (text: string) => unknown;
    error: (text: string) => unknown;
  };
  text: MonitorEditorCommandText;
};

export type MonitorEditorCommandRequest = Omit<MonitorEditorCommandInput, 'queryClient'>;
