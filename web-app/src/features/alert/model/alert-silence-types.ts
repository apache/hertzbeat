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

import type { PagedCollection } from '@/shared/pagination';

export type AlertSilenceQuery = { search: string; pageIndex: number; pageSize: number };
export type AlertSilenceType = 0 | 1;

type AlertSilenceWritableSnapshot = {
  matchAll: boolean;
  type: AlertSilenceType;
  times: number | null;
  labels: Record<string, string> | null;
  days: number[] | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export type AlertSilenceDraft = {
  id?: number;
  name: string;
  enable: boolean;
  matchAll: boolean;
  type: AlertSilenceType;
  labelsText: string;
  days: number[];
  periodStart: string;
  periodEnd: string;
  persisted?: AlertSilenceWritableSnapshot;
};

export type AlertSilence = {
  id: number;
  name: string;
  enable: boolean;
  matchAll: boolean;
  type: AlertSilenceType;
  times: number | null;
  labels: Record<string, string> | null;
  days: number[] | null;
  periodStart: string | null;
  periodEnd: string | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type AlertSilencePage = PagedCollection<AlertSilence>;
