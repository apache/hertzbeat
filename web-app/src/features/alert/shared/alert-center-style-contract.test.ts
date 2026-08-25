/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import styles from './alert-center.module.css?raw';

describe('Alert Center selection style contract', () => {
  it('keeps checked and partially checked table boxes visibly filled', () => {
    expect(styles).toContain('.ant-checkbox-checked .ant-checkbox-inner');
    expect(styles).toContain('.ant-checkbox-indeterminate .ant-checkbox-inner');
    expect(styles).toMatch(/ant-checkbox-checked[\s\S]*background:\s*var\(--hb-brand-accent\)/);
  });

  it('uses one flat diagnostic action strip with durable interaction targets', () => {
    expect(styles).toContain('.diagnosticActions');
    expect(styles).toContain('.diagnosticPrimary');
    expect(styles).toContain('.diagnosticSecondary');
    expect(styles).toMatch(/\.diagnosticActions[\s\S]*min-height:\s*32px/);
    expect(styles).toMatch(/\.diagnosticPrimary,[\s\S]*\.diagnosticSecondary[\s\S]*height:\s*30px/);
  });
});
