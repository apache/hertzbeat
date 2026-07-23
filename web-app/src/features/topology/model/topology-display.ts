/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
