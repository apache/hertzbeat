/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import api from './api/notice-receiver-api.ts?raw';
import schema from './api/notice-receiver-schema.ts?raw';
import editor from './components/notice-receiver-editor.tsx?raw';
import fields from './components/notice-receiver-fields.tsx?raw';
import results from './components/notice-receiver-results.tsx?raw';
import command from './controller/use-notice-receiver-command-controller.ts?raw';
import controller from './controller/notice-receiver-controller.ts?raw';
import read from './controller/use-notice-receiver-read-controller.ts?raw';
import evidence from './notice-receiver-evidence.ts?raw';
import failure from './notice-receiver-failure.ts?raw';
import model from './model/notice-receiver-model.ts?raw';
import catalog from './model/notice-receiver-catalog.ts?raw';
import page from './pages/notice-receiver-page.tsx?raw';
import resource from './notice-receiver-resource.ts?raw';

describe('notice receiver architecture', () => {
  it('keeps response shape validation in a named schema boundary', () => {
    expect(api).toContain("from './notice-receiver-schema'");
    expect(api).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
  });

  it('keeps transport and resource hooks out of the page and editor', () => {
    for (const source of [page, editor, fields, results]) {
      expect(source).not.toMatch(/@tanstack\/react-query|@refinedev\/core|notice-receiver-api|apiMessage/);
    }
    expect(controller).not.toMatch(/@refinedev\/core|notice-receiver-api|apiMessage/);
    expect(controller).toMatch(/useNoticeReceiverReadController/);
    expect(controller).toMatch(/useNoticeReceiverCommandController/);
    expect(read).toMatch(/useList/);
    expect(read).toMatch(/useDataProvider/);
    expect(read).not.toMatch(/useCreate|useUpdate|useDelete|testNoticeReceiver/);
    expect(command).toMatch(/useCreate/);
    expect(command).toMatch(/useUpdate/);
    expect(command).toMatch(/useDelete/);
    expect(command).not.toMatch(/useList|useDataProvider/);
  });

  it('keeps the Refine resource name in one named feature source', () => {
    expect(resource).toContain("export const noticeReceiverResourceName = 'notice-receivers'");
    expect(read).not.toContain("'notice-receivers'");
    expect(command).not.toContain("'notice-receivers'");
  });

  it('keeps receiver and secret enums in the catalog instead of duplicating schema literals', () => {
    expect(schema).toContain("from '../model/notice-receiver-catalog'");
    expect(schema).not.toMatch(/z\.literal\((?:0|14)\)/);
    expect(catalog).toContain('export const noticeReceiverSecretKeyCatalog');
    expect(catalog).toContain('type NoticeReceiverSecretKey = (typeof noticeReceiverSecretKeyCatalog)[number]');
    expect(catalog).toContain('receiverTypeDefinitions.map(definition => definition.type)');
    expect(catalog).not.toMatch(/noticeReceiverTypes\s*=\s*\[0,/);
    expect(editor).toContain('maxLength={noticeReceiverNameMaxLength}');
    expect(fields).toContain('max={noticeReceiverAgentIdMax}');
  });

  it('keeps secrets away from URL and persistent browser storage', () => {
    for (const source of [api, model, controller, read, command, evidence, failure, editor, fields]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|console\.(log|debug|info)/);
      expect(source).not.toMatch(/[?&](token|secret|password|credential)=/i);
    }
  });
});
