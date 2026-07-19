/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import api from './api/message-server-api.ts?raw';
import emailEditor from './components/email-server-editor.tsx?raw';
import editors from './components/message-server-editors.tsx?raw';
import controller from './controller/use-message-server-controller.ts?raw';
import model from './model/message-server-model.ts?raw';
import page from './pages/message-server-page.tsx?raw';

describe('message server architecture', () => {
  it('keeps response schemas in the API boundary and domain contracts out of transport', () => {
    expect(api).toContain("from './message-server-schema'");
    expect(api).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
    expect(model).not.toMatch(/api\/message-server-api/);
  });

  it('keeps query, mutation, transport, and payload ownership outside the page', () => {
    expect(page).not.toMatch(/@tanstack\/react-query/);
    expect(page).not.toMatch(/message-server-api/);
    expect(page).not.toMatch(/\buse(Query|Mutation)\b/);
    expect(page).not.toMatch(/build(Email|Sms)ServerPayload/);
    expect(controller).toMatch(/buildEmailServerPayload/);
    expect(controller).toMatch(/classifyMessageServerReadError/);
  });

  it('keeps the email modal shell separate from field and configured-secret presentation', () => {
    expect(emailEditor).toMatch(/function EmailServerFields/);
    expect(emailEditor).toMatch(/function ConfiguredEmailSecret/);
    expect(emailEditor).toMatch(/maskClosable=\{false\}/);
    expect(emailEditor).toMatch(/confirmLoading=\{saving\}/);
    expect(emailEditor).toMatch(/closable=\{!editorLocked\}/);
    expect(emailEditor).toMatch(/keyboard=\{!editorLocked\}/);
    expect(emailEditor).toMatch(/MessageServerSaveRecovery/);
  });

  it('uses typed SMS provider boundaries instead of unchecked casts and partial catalog lookup', () => {
    for (const source of [model, editors, page]) {
      expect(source).not.toMatch(/as unknown as/);
      expect(source).not.toMatch(/smsProviderDefinitions\.find\([^\n]+\)!/);
    }
    expect(model).toMatch(/activeSmsProviderValues/);
    expect(model).toMatch(/smsProviderDefinition/);
  });
});
