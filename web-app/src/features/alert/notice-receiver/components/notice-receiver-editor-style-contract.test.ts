/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import css from './notice-receiver-editor.module.css?raw';

describe('notice receiver editor source geometry', () => {
  it('keeps a 7/12/5 horizontal field grid, source footer boundary, and responsive single-column fallback', () => {
    expect(css).toMatch(/grid-template-columns:\s*minmax\(0,\s*7fr\)\s+minmax\(0,\s*12fr\)\s+minmax\(0,\s*5fr\)/);
    expect(css).toMatch(/\.modal\s+:global\(\.ant-modal-footer\)/);
    expect(css).toMatch(/border-top:\s*1px solid var\(--ant-color-border-secondary\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*800px\)/);
    expect(css).toMatch(/\.fieldRow\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  });
});
