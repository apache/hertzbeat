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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MonitorAppHierarchyNode } from '@/features/monitor';

import { createAlertRuleDraft, type AlertRuleDraft } from '../model/alert-rule-model';
import { AlertRuleMetricTargetFields } from './alert-rule-metric-target-fields';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const hierarchy: MonitorAppHierarchyNode = {
  category: 'application',
  value: 'springboot3',
  label: 'Spring Boot 3',
  isLeaf: false,
  hide: false,
  type: null,
  unit: null,
  children: [
    {
      category: null,
      value: 'summary',
      label: 'Summary',
      isLeaf: false,
      hide: false,
      type: null,
      unit: null,
      children: []
    }
  ]
};

describe('Alert Rule metric target fields', () => {
  afterEach(cleanup);

  it('keeps application and target selection as two explicit dependent actions', async () => {
    const changeApplication = vi.fn();
    const changeTarget = vi.fn();
    const draft = targetedDraft({ app: 'springboot3' });
    renderTarget(
      draft,
      {
        apps: {
          kind: 'ready',
          apps: [
            { category: 'application', value: 'linux', label: 'Linux' },
            { category: 'application', value: 'springboot3', label: 'Spring Boot 3' }
          ]
        },
        hierarchy: { kind: 'ready', hierarchy }
      },
      changeApplication,
      changeTarget
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'alertRules.metricTarget.application' }));
    fireEvent.click(await screen.findByText('Linux'));
    await waitFor(() => expect(changeApplication).toHaveBeenCalledWith('linux'));

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'alertRules.metricTarget.target' }));
    fireEvent.click(await screen.findByText('alertRules.metricTarget.availability'));
    await waitFor(() => expect(changeTarget).toHaveBeenCalledWith({ kind: 'availability', app: 'springboot3' }));
  });

  it('keeps an unavailable hierarchy distinct and retryable without hiding the selected app', () => {
    const retryHierarchy = vi.fn();
    renderTarget(
      targetedDraft({ app: 'springboot3' }),
      {
        apps: {
          kind: 'ready',
          apps: [{ category: 'application', value: 'springboot3', label: 'Spring Boot 3' }]
        },
        hierarchy: { kind: 'unavailable' }
      },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      retryHierarchy
    );

    expect(screen.getByRole('combobox', { name: 'alertRules.metricTarget.application' })).toBeEnabled();
    expect(screen.getByText('alertRules.metricTarget.hierarchyUnavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retryHierarchy).toHaveBeenCalledTimes(1);
  });

  it('preserves unparsed legacy expressions in an explicit expert fallback', () => {
    const update = vi.fn();
    const draft: AlertRuleDraft = {
      ...createAlertRuleDraft(),
      expr: 'custom(value)',
      metricEditor: { kind: 'unparsed', expression: 'custom(value)' }
    };
    renderTarget(
      draft,
      { apps: { kind: 'ready', apps: [] }, hierarchy: { kind: 'idle' } },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      update
    );

    expect(screen.getByText('alertRules.metricTarget.legacyExpression')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'alertRules.expression' }), {
      target: { value: 'custom(next)' }
    });
    expect(update).toHaveBeenCalledWith({ expr: 'custom(next)' });
  });
});

function renderTarget(
  draft: AlertRuleDraft,
  metricTarget: Parameters<typeof AlertRuleMetricTargetFields>[0]['state'],
  changeApplication: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeApplication'],
  changeTarget: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeTarget'],
  retryApps = vi.fn(),
  retryHierarchy = vi.fn(),
  update = vi.fn()
) {
  render(
    <AlertRuleMetricTargetFields
      busy={false}
      draft={draft}
      state={metricTarget}
      update={update}
      changeApplication={changeApplication}
      changeAuthoringMode={vi.fn()}
      changeExpertCondition={vi.fn()}
      changeStructuredCondition={vi.fn()}
      changeTarget={changeTarget}
      retryApps={retryApps}
      retryHierarchy={retryHierarchy}
    />
  );
}

function targetedDraft(patch: { app: string }): AlertRuleDraft {
  return {
    ...createAlertRuleDraft(),
    metricEditor: {
      kind: 'targeted',
      app: patch.app,
      target: null,
      monitorIds: [],
      monitorLabels: [],
      authoring: {
        mode: 'structured',
        condition: { kind: 'group', join: 'and', items: [] }
      }
    }
  };
}
