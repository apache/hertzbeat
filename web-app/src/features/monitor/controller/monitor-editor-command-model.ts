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

import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';

import type { MonitorEditorMode, MonitorParamDefine } from '../model/monitor-contract';
import type { MonitorEditorDraft } from '../model/monitor-editor-model';

export type MonitorEditorCommandText = {
  validation: string;
  detectSuccess: string;
  detectFailed: string;
  saveSuccess: string;
  saveFailed: string;
  saveUnknown: string;
};

export type MonitorEditorCommandInput = {
  mode: MonitorEditorMode;
  id: number | undefined;
  source: string;
  saved?: () => void;
  draft: MonitorEditorDraft | undefined;
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
