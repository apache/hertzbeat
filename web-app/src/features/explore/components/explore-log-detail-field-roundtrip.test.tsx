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

import { afterEach, beforeAll, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import fixtures from '../../../../../hertzbeat-observability/src/test/resources/log-detail-field-actions.json';
import { logInspectorFields } from './explore-log-inspector-model';
import { InspectorFields } from './explore-log-inspector-fields';
import { logInspectorFilterPatch, logInspectorFilterDisabledReason } from '../model/explore-log-inspector-filter';
import type { LogRow } from '../model/explore-signal-contract';
import { queryTokens, tokenRemovalRange } from './log-search-token-scanner';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

// The Java parser test consumes these exact fixtures, including the remaining expression.
it.each(fixtures.flatMap(fixture => (['include', 'exclude'] as const).map(action => ({ fixture, action }))))(
  'round trips $action for $fixture.scope:$fixture.key through detail actions and token removal',
  async ({ fixture, action }) => {
    const rawValue = fixture.valueKind === 'number' ? Number(fixture.value) : fixture.value;
    const nestedValue = fixture.children.length ? { [fixture.children[0]!]: rawValue } : rawValue;
    const row = {
      [fixture.scope === 'resource' ? 'resource' : 'attributes']: { [fixture.key]: nestedValue }
    } as unknown as LogRow;
    const draft = { searchSyntax: 'structured-v1' as const, query: fixture.remaining };
    let result: string | undefined;
    render(
      <I18nextProvider i18n={i18n}>
        <InspectorFields
          row={row}
          fields={logInspectorFields(row)}
          search=""
          setSearch={() => {}}
          matchIndex={0}
          setMatchIndex={() => {}}
          logFilterDraft={draft}
          onAddLogFilter={(target, operator) => {
            expect(target).toMatchObject({ scope: fixture.scope, key: fixture.key, value: fixture.value });
            expect(operator).toBe(action === 'include' ? '=' : '!=');
            result = logInspectorFilterPatch(draft, target, operator)?.query;
            return Boolean(result);
          }}
        />
      </I18nextProvider>
    );
    const prefix = fixture.scope === 'resource' ? 'resource' : 'attributes';
    fireEvent.click(
      screen.getByRole('button', { name: `Field actions: ${[prefix, fixture.key, ...fixture.children].join('.')}` })
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: action === 'include' ? /^Include / : /^Exclude / }));
    const clause = fixture[action];
    expect(result).toBe(`(${fixture.remaining}) AND ${clause}`);
    if (!result) throw new Error('Expected serialized detail predicate');
    const token = queryTokens(result).find(item => item.raw === clause.replace(/^NOT /u, ''));
    expect(token?.removable).toBe(true);
    if (!token) throw new Error('Expected one intact escaped field token');
    const range = tokenRemovalRange(result, token);
    expect((result.slice(0, range.from) + result.slice(range.to)).trim()).toBe(`(${fixture.remaining})`);
  }
);

it.each(['quote"key', 'back\\slash', 'bad key'])(
  'keeps unsupported detail key %j unavailable and rejects it without broadening field grammar',
  async key => {
    const row = { attributes: { [key]: 'café "value"' } } as LogRow;
    render(
      <I18nextProvider i18n={i18n}>
        <InspectorFields
          row={row}
          fields={logInspectorFields(row)}
          search=""
          setSearch={() => {}}
          matchIndex={0}
          setMatchIndex={() => {}}
          logFilterDraft={{ searchSyntax: 'structured-v1' }}
          onAddLogFilter={() => {
            throw new Error('Unsupported action must remain disabled');
          }}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: `Field actions: attributes.${key}` }));
    await screen.findByRole('menu');
    for (const label of [/^Include /, /^Exclude /, /^Replace /]) {
      expect(screen.queryByRole('menuitem', { name: label })).toBeNull();
    }
    const target = { scope: 'attribute' as const, key, value: 'café "value"' };
    for (const operator of ['=', '!='] as const) {
      expect(logInspectorFilterDisabledReason({ searchSyntax: 'structured-v1' }, target, operator)).toBe('invalid');
      expect(logInspectorFilterPatch({ searchSyntax: 'structured-v1' }, target, operator)).toBeUndefined();
    }
  }
);
