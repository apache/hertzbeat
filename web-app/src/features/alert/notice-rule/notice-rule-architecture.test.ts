/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import editor from './components/notice-rule-editor.tsx?raw';
import controller from './controller/notice-rule-controller.ts?raw';
import page from './pages/notice-rule-page.tsx?raw';

describe('notice rule architecture', () => {
  it('keeps transport, query state, and resource hooks out of pages and components', () => {
    for (const source of [page, editor]) {
      expect(source).not.toMatch(/@tanstack\/react-query|@refinedev\/core|apiMessage|notice-rule-api|useSearchParams/);
    }
    expect(controller).toMatch(/useList/);
    expect(controller).toMatch(/useDataProvider/);
    expect(controller).not.toMatch(/apiMessage/);
  });
});
