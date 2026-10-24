/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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
import {
  applyProviderOption,
  formForProvider,
  providerEndpoint,
  providerInput,
  selectableProviderOptions
} from './agent-provider-form';

describe('model connection edits', () => {
  it('renders a legacy custom connection as a generic protocol while retaining its saved identity and secrets', () => {
    const saved = {
      uid: 'old',
      type: 'openai-compatible',
      code: 'custom',
      baseUrl: 'https://proxy.invalid/v1',
      model: 'private-model',
      apiKeyConfigured: true
    };
    const form = formForProvider(saved);
    expect(form.selection).toBe('protocol:openai-chat');
    expect(providerInput(form, saved)).toMatchObject({
      uid: 'old',
      type: 'openai-compatible',
      code: 'custom',
      baseUrl: saved.baseUrl,
      model: saved.model
    });
    expect(providerInput(form, saved)).not.toHaveProperty('apiKey');
  });
  it('does not expose the retired custom preset for new connections', () => {
    const option = {
      type: 'openai-compatible',
      code: 'custom',
      label: 'OpenAI Compatible',
      defaultBaseUrl: null,
      defaultModel: null,
      requiredFields: []
    };
    expect(selectableProviderOptions([option])).toEqual([]);
  });
  it('keeps name and credentials when applying a vendor preset', () => {
    const current = formForProvider({
      uid: 'draft',
      type: 'protocol',
      code: 'openai-chat',
      name: 'My gateway',
      baseUrl: 'https://old.invalid',
      model: '',
      apiKeyConfigured: false,
      authMode: 'custom-header'
    });
    current.apiKey = 'draft-key';
    current.headersJson = '{"X-Token":"draft-token"}';
    const next = applyProviderOption(
      {
        type: 'openai-compatible',
        code: 'openrouter',
        label: 'OpenRouter',
        defaultBaseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: null,
        requiredFields: []
      },
      current
    );
    expect(next).toMatchObject({
      name: current.name,
      apiKey: current.apiKey,
      authMode: 'custom-header',
      headersJson: current.headersJson,
      baseUrl: 'https://openrouter.ai/api/v1'
    });
  });
  it('keeps legacy identity and blank secret fields when editing a named protocol connection', () => {
    const saved = {
      uid: 'one',
      type: 'openai-compatible',
      code: 'openai',
      baseUrl: 'https://gateway.invalid/v1',
      model: 'm',
      apiKeyConfigured: true,
      headers: { 'X-Token': '' }
    };
    const form = formForProvider(saved);
    const input = providerInput(form, saved);
    expect(input.type).toBe(saved.type);
    expect(input.code).toBe(saved.code);
    expect(input).not.toHaveProperty('apiKey');
    expect(input.headers).toEqual({ 'X-Token': '' });
  });
  it('shows the exact custom prefix without duplicating a version or endpoint suffix', () => {
    expect(providerEndpoint('https://gateway.invalid/proxy/v1', 'openai-responses')).toBe(
      'https://gateway.invalid/proxy/v1/responses'
    );
    expect(providerEndpoint('https://gateway.invalid/proxy/v1/responses/', 'openai-responses')).toBe(
      'https://gateway.invalid/proxy/v1/responses'
    );
  });
});
