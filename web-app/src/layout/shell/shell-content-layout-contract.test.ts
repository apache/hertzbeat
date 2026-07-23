/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import shellStyles from './hertzbeat-shell.module.css?raw';

describe('shell content layout contract', () => {
  it('constrains route content before the shell fallback overflow boundary', () => {
    const contentRule = shellStyles.match(/\.content\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(contentRule).toBeDefined();
    expect(contentRule).toMatch(/display:\s*grid/);
    expect(contentRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(contentRule).toMatch(/overflow-x:\s*auto/);
    expect(contentRule).not.toMatch(/overflow-x:\s*(hidden|clip)/);
  });
});
