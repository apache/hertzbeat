/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
