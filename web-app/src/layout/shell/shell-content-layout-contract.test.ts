/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import shellStyles from './hertzbeat-shell.module.css?raw';

describe('shell content layout contract', () => {
  it('does not turn shell wrappers into scroll containers around sticky navigation', () => {
    const shellRule = shellStyles.match(/\.shell\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const shellBodyRule = shellStyles.match(/\.shellBody\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const navigationRule = shellStyles.match(/\.navigation\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(shellRule).toMatch(/--hb-shell-header-height:\s*46px/);
    expect(shellRule).toMatch(/overflow-x:\s*clip/);
    expect(shellRule).not.toMatch(/overflow-x:\s*(auto|hidden)/);
    expect(shellBodyRule).toMatch(/overflow-x:\s*clip/);
    expect(shellBodyRule).toMatch(/overflow-y:\s*visible/);
    expect(shellBodyRule).not.toMatch(/overflow:\s*hidden/);
    expect(navigationRule).toMatch(/position:\s*sticky/);
    expect(navigationRule).toMatch(/top:\s*var\(--hb-shell-header-height\)/);
  });

  it('constrains route content before the shell fallback overflow boundary', () => {
    const contentRule = shellStyles.match(/\.content\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const routeChildRule = shellStyles.match(/:where\(\.content\s*>\s*\*\)\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(contentRule).toBeDefined();
    expect(contentRule).toMatch(/display:\s*grid/);
    expect(contentRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(contentRule).toMatch(/overflow-x:\s*auto/);
    expect(contentRule).not.toMatch(/overflow-x:\s*(hidden|clip)/);
    expect(routeChildRule).toMatch(/min-width:\s*0/);
    expect(routeChildRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });
});
