/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import stylesheet from './login-page.module.css?raw';

describe('login page visual contract', () => {
  it('uses the original artwork on desktop and preserves its light-theme treatment', () => {
    expect(stylesheet).toContain("url('/assets/bg.png')");
    expect(stylesheet).toMatch(/@media \(min-width: 960px\)[\s\S]*\.page\s*{[^}]*linear-gradient/s);
    expect(stylesheet).toMatch(/:global\(:root\[data-theme='default'\]\)\s+\.page/);
    expect(stylesheet).toMatch(/@media \(min-width: 960px\)/);
  });

  it('keeps the form narrow, the explanation desktop-only, and the passport route responsive', () => {
    expect(stylesheet).toMatch(/\.formRegion\s*{[^}]*width:\s*min\(368px, 100%\)/s);
    expect(stylesheet).toMatch(/@media \(max-width: 959px\)[\s\S]*\.introduction\s*{[^}]*display:\s*none/s);
    expect(stylesheet).toMatch(/body:has\(\[data-passport-page='true'\]\)[^}]*min-width:\s*0/s);
  });
});
