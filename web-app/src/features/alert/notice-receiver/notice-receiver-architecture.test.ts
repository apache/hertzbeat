/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import api from './api/notice-receiver-api.ts?raw';
import editor from './components/notice-receiver-editor.tsx?raw';
import controller from './controller/notice-receiver-controller.ts?raw';
import model from './model/notice-receiver-model.ts?raw';
import page from './pages/notice-receiver-page.tsx?raw';

describe('notice receiver architecture', () => {
  it('keeps response shape validation in a named schema boundary', () => {
    expect(api).toContain("from './notice-receiver-schema'");
    expect(api).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
  });

  it('keeps transport and resource hooks out of the page and editor', () => {
    expect(page).not.toMatch(/@tanstack\/react-query|@refinedev\/core|notice-receiver-api|apiMessage/);
    expect(editor).not.toMatch(/@tanstack\/react-query|@refinedev\/core|notice-receiver-api|apiMessage/);
    expect(controller).toMatch(/useList/);
    expect(controller).toMatch(/useCreate/);
    expect(controller).toMatch(/useUpdate/);
    expect(controller).toMatch(/useDelete/);
  });

  it('keeps secrets away from URL and persistent browser storage', () => {
    for (const source of [api, model, controller]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|console\.(log|debug|info)/);
      expect(source).not.toMatch(/[?&](token|secret|password|credential)=/i);
    }
  });
});
