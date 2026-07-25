/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { monitorExportFilename } from './monitor-export-model';

describe('monitor export model', () => {
  it('uses a decoded safe server filename and falls back by format', () => {
    expect(monitorExportFilename('attachment;filename=HertzBeat%20Monitors.json', 'JSON')).toBe(
      'HertzBeat Monitors.json'
    );
    expect(monitorExportFilename('attachment; filename="../../private.xlsx"', 'EXCEL')).toBe('private.xlsx');
    expect(monitorExportFilename('attachment; filename="bad\u0000name.json"', 'JSON')).toBe('hertzbeat-monitors.json');
    expect(monitorExportFilename('attachment; filename=".."', 'JSON')).toBe('hertzbeat-monitors.json');
    expect(monitorExportFilename(null, 'EXCEL')).toBe('hertzbeat-monitors.xlsx');
  });
});
