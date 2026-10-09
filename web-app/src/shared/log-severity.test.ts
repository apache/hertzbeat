/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { logSeverityCategory, logSeverityLabel } from './log-severity';
it('maps all valid OTLP numeric severity ranges only when text is missing', () => {
  ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].forEach((label, index) => {
    for (let number = index * 4 + 1; number <= index * 4 + 4; number++) {
      expect(logSeverityLabel({ severityNumber: number, severityText: '' })).toBe(label);
    }
  });
  expect(logSeverityLabel({ severityText: 'SEVERE', severityNumber: 17 })).toBe('SEVERE');
  expect(logSeverityCategory(17)).toBe('ERROR');
  expect(logSeverityLabel({ severityText: null, severityNumber: 9 })).toBe('INFO');
  for (const severityNumber of [0, 25, -1, 1.5, NaN, null]) {
    expect(logSeverityLabel({ severityText: null, severityNumber })).toBeUndefined();
  }
});
