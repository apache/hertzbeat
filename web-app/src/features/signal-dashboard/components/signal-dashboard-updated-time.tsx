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

import { useTranslation } from 'react-i18next';

export function SignalDashboardUpdatedTime({
  value,
  timeZone
}: {
  value: string | null | undefined;
  timeZone: string;
}) {
  const { t, i18n } = useTranslation();
  if (!value) return t('common.unknown');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i.test(value))
    return <code>{value}</code>;
  const civil = new Date(`${value.replace(/(?:Z|[+-]\d{2}:\d{2})$/i, '')}Z`);
  if (!Number.isFinite(civil.getTime()) || civil.toISOString().slice(0, 19) !== value.slice(0, 19))
    return <code>{value}</code>;
  const hasOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const date = new Date(hasOffset ? value : `${value}Z`);
  if (!Number.isFinite(date.getTime())) return <code>{value}</code>;
  const display = formatSourceTime(date, i18n.language, hasOffset ? timeZone : 'UTC');
  if (display === undefined) return <code>{value}</code>;
  return (
    <details>
      <summary>
        {display} · {hasOffset ? timeZone : t('signalDashboard.timeZoneUnspecified')}
      </summary>
      <code>{value}</code>
    </details>
  );
}

function formatSourceTime(date: Date, locale: string, timeZone: string): string | undefined {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium', timeZone }).format(date);
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}
