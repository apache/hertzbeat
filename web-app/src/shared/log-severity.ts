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

const LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;
export function logSeverityLabel(row: { severityText?: string | null; severityNumber?: number | null }) {
  if (row.severityText?.trim()) return row.severityText.toUpperCase();
  return logSeverityCategory(row.severityNumber);
}
export function logSeverityCategory(number: number | null | undefined) {
  if (number == null || !Number.isInteger(number) || number < 1 || number > 24) return undefined;
  return LEVELS[Math.floor((number - 1) / 4)];
}
