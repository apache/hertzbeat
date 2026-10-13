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

import type { AgentProviderConfiguration, AgentProviderInput, AgentProviderOption } from './agent-provider-contract';

export type ProviderForm = AgentProviderInput & { selection: string; headersJson: string };

export function providerInput(value: ProviderForm, provider: AgentProviderConfiguration | null): AgentProviderInput {
  return {
    ...(provider ? { uid: provider.uid } : {}),
    type: provider?.type ?? 'protocol',
    code: provider?.code ?? value.protocol ?? 'openai-chat',
    protocol: value.protocol ?? 'openai-chat',
    name: value.name,
    authMode: value.authMode,
    baseUrl: value.baseUrl,
    model: value.model,
    ...(value.apiKey ? { apiKey: value.apiKey } : {}),
    headers: parseHeaders(value.headersJson)
  };
}

export function parseHeaders(value: string | undefined): Record<string, string> {
  const parsed: unknown = JSON.parse(value?.trim() || '{}');
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    Object.values(parsed).some(item => typeof item !== 'string')
  )
    throw new Error('headers');
  return parsed as Record<string, string>;
}

export function formForProvider(provider: AgentProviderConfiguration): ProviderForm {
  const protocol = provider.protocol ?? 'openai-chat';
  const generic = provider.code === 'custom' || (provider.type !== 'protocol' && protocol !== 'openai-chat');
  return {
    selection: generic ? `protocol:${protocol}` : providerKey(provider),
    uid: provider.uid,
    type: provider.type,
    code: provider.code,
    protocol: provider.protocol ?? 'openai-chat',
    name: provider.name ?? provider.code,
    authMode: provider.authMode ?? 'default',
    baseUrl: provider.baseUrl ?? '',
    model: provider.model ?? '',
    apiKey: '',
    headersJson: JSON.stringify(provider.headers ?? {}, null, 2)
  };
}

export function selectableProviderOptions(options: AgentProviderOption[]): AgentProviderOption[] {
  return options.filter(option => !(option.type === 'openai-compatible' && option.code === 'custom'));
}

export function applyProviderOption(option: AgentProviderOption, current: ProviderForm): ProviderForm {
  const preset = formForOption(option);
  return {
    ...current,
    selection: preset.selection,
    protocol: preset.protocol,
    baseUrl: option.defaultBaseUrl ?? current.baseUrl,
    model: option.defaultModel ?? current.model
  };
}

export function providerKey(provider: Pick<AgentProviderOption, 'type' | 'code'>) {
  return `${provider.type}:${provider.code}`;
}

export function formForOption(option: AgentProviderOption | undefined): ProviderForm {
  return {
    selection: option ? providerKey(option) : '',
    type: 'protocol',
    code: option?.code ?? 'openai-chat',
    protocol: option?.type === 'protocol' ? option.code : 'openai-chat',
    name: '',
    authMode: 'default',
    baseUrl: option?.defaultBaseUrl ?? '',
    model: option?.defaultModel ?? '',
    apiKey: '',
    headersJson: '{}'
  };
}

export function providerEndpoint(base: string | undefined, protocol: string | undefined): string {
  if (!base) return '';
  const suffix =
    protocol === 'openai-responses'
      ? '/responses'
      : protocol === 'anthropic-messages'
        ? '/messages'
        : '/chat/completions';
  const prefix = base.trim().replace(/\/+$/, '');
  return prefix.endsWith(suffix) ? prefix : prefix + suffix;
}
