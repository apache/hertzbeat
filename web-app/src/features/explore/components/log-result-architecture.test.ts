/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { describe, expect, it } from 'vitest';
import detailSource from './log-detail.tsx?raw';
import source from './log-result.tsx?raw';
import rowsSource from './log-rows.tsx?raw';
import streamSource from './log-stream-result.tsx?raw';

describe('Log result architecture', () => {
  it('keeps live transport, effects, and parsing out of the presentation component', () => {
    expect(source).not.toMatch(/buildLogStreamPath|openLogStream|EventSource|JSON\.parse|useEffect/);
    expect(source).not.toMatch(/from\s+["']\.\.\/api\//);
    expect(source).not.toContain('useLiveLogController');
  });

  it('keeps result-state orchestration separate from row and detail presentation', () => {
    expect(source).toContain("from './log-rows'");
    expect(source).toContain("from './log-stream-result'");
    expect(source).not.toMatch(/\bTable\b|\bDrawer\b|\bDescriptions\b|OtlpAttributeSection/);

    expect(streamSource).toContain('<LogRows');
    expect(streamSource).toMatch(/stream\.status === ['"]paused['"]/);
    expect(streamSource).toContain('switch (status)');
    expect(streamSource).not.toContain(': status ===');
    expect(rowsSource).toMatch(/<Table<LogRow>|useState<LogRow>|<LogDetail/);
    expect(rowsSource).not.toMatch(/import\s+\{[^}]*formatLogTime[^}]*\}\s+from ['"]\.\/log-detail['"]/);
    expect(detailSource).toMatch(/<Drawer|<Descriptions|OtlpAttributeSection/);
  });
});
