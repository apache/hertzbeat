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

export function formatShortLocalTime(
  timestamp: number,
  options: { milliseconds?: boolean; date?: boolean; timeZone?: string | undefined } = {}
) {
  return new Intl.DateTimeFormat(undefined, {
    ...(options.date ? ({ month: '2-digit', day: '2-digit' } as const) : {}),
    timeZone: options.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
    ...(options.milliseconds ? ({ fractionalSecondDigits: 3 } as const) : {})
  }).format(new Date(timestamp));
}

export function formatShortLocalTimeRange(
  from: number,
  to: number,
  options: { locale?: string; timeZone?: string } = {}
) {
  const calendar = new Intl.DateTimeFormat(options.locale, { dateStyle: 'short', timeZone: options.timeZone });
  const crossesDate = calendar.format(from) !== calendar.format(to);
  const timeOptions: Intl.DateTimeFormatOptions = {
    ...(crossesDate ? ({ month: '2-digit', day: '2-digit' } as const) : {}),
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: options.timeZone
  };
  const zoneFormatter = new Intl.DateTimeFormat(options.locale, { ...timeOptions, timeZoneName: 'short' });
  const fromZone = zoneFormatter.formatToParts(from).find(part => part.type === 'timeZoneName')?.value;
  const toZone = zoneFormatter.formatToParts(to).find(part => part.type === 'timeZoneName')?.value;
  if (fromZone !== toZone) return `${zoneFormatter.format(from)} – ${zoneFormatter.format(to)}`;
  const range = new Intl.DateTimeFormat(options.locale, timeOptions).formatRange(new Date(from), new Date(to));
  return toZone ? `${range} ${toZone}` : range;
}
