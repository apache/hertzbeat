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

type CsvValue = string | number | null | undefined;
const spreadsheetFormulaPrefixes = new Set(['=', '+', '-', '@']);

export function serializeCsv(rows: readonly (readonly CsvValue[])[]) {
  return rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function escapeCsvCell(value: CsvValue) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('CSV_NON_FINITE_NUMBER');
    return `"${String(value)}"`;
  }
  const raw = value == null ? '' : String(value);
  let firstMeaningfulCharacter: string | undefined;
  for (const character of raw) {
    if (character.charCodeAt(0) > 32) {
      firstMeaningfulCharacter = character;
      break;
    }
  }
  const safe = spreadsheetFormulaPrefixes.has(firstMeaningfulCharacter ?? '') ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
