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

import { saveBrowserDownload } from '@/shared/browser-download';
import type { MonitorHistoryChart } from './monitor-detail-model';

export function monitorHistoryImageFilename(chart: MonitorHistoryChart) {
  const metric = chart.metric.key.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 120) || 'metric';
  return `hertzbeat-${metric}-${chart.history}-${chart.interval ? 'aggregated' : 'raw'}.png`;
}

export function saveMonitorHistoryImage(dataUrl: string, chart: MonitorHistoryChart) {
  const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix)) throw new Error('Chart PNG is unavailable');
  const bytes = Uint8Array.from(atob(dataUrl.slice(prefix.length)), character => character.charCodeAt(0));
  if (bytes.length === 0) throw new Error('Chart PNG is empty');
  saveBrowserDownload({ data: new Blob([bytes], { type: 'image/png' }), filename: monitorHistoryImageFilename(chart) });
}
