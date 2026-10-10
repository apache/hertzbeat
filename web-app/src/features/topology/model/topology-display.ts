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

import type { ExactTimeWindow } from '@/shared/query-context';

export function formatTopologyWindow(window: ExactTimeWindow | undefined, locale: string) {
  if (!isExactWindow(window)) return '—';
  const from = new Date(window.from);
  const to = new Date(window.to);
  if ([from, to].some(value => Number.isNaN(value.getTime()))) return '—';
  const formatter = new Intl.DateTimeFormat(locale || 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  return formatter.formatRange(from, to);
}

function isExactWindow(window: ExactTimeWindow | undefined): window is ExactTimeWindow {
  return Boolean(
    window &&
    Number.isSafeInteger(window.from) &&
    Number.isSafeInteger(window.to) &&
    window.from > 0 &&
    window.from < window.to
  );
}
