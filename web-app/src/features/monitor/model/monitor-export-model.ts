/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export const monitorExportFormats = ['JSON', 'EXCEL'] as const;

export type MonitorExportFormat = (typeof monitorExportFormats)[number];
export type MonitorExportScope = { kind: 'selected'; ids: number[] } | { kind: 'all' };
export type MonitorExportArtifact = { data: Blob; filename: string };

const monitorExportFallbackNames: Record<MonitorExportFormat, string> = {
  JSON: 'hertzbeat-monitors.json',
  EXCEL: 'hertzbeat-monitors.xlsx'
};

export function monitorExportFilename(contentDisposition: string | null, format: MonitorExportFormat) {
  const fallback = monitorExportFallbackNames[format];
  const encoded = contentDispositionFilename(contentDisposition);
  if (!encoded) return fallback;
  const decoded = decodeFilename(encoded);
  const leaf = decoded.split(/[\\/]/).at(-1)?.trim();
  if (
    !leaf ||
    leaf === '.' ||
    leaf === '..' ||
    leaf.length > 255 ||
    [...leaf].some(character => isControlCharacter(character))
  ) {
    return fallback;
  }
  return leaf;
}

function contentDispositionFilename(value: string | null) {
  if (!value) return undefined;
  const extended = value.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (extended) return extended.trim();
  const regular = value.match(/(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i);
  return (regular?.[1] ?? regular?.[2])?.trim();
}

function decodeFilename(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'));
  } catch {
    return value;
  }
}

function isControlCharacter(value: string) {
  const code = value.charCodeAt(0);
  return code < 32 || code === 127;
}
