/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { logInspectorFields } from './explore-log-inspector-model';
import { LogFieldMenu } from './explore-log-field-menu';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('offers numeric analysis for literal numeric fields but not strings or nested paths', () => {
  const fields = logInspectorFields({
    body: 'fixture',
    severityNumber: null,
    severityText: null,
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null,
    logRecordUid: null,
    timeUnixNano: null,
    observedTimeUnixNano: null,
    attributes: { 'proof.value': 12, text: '12', nested: { value: 12 } }
  });
  expect(fields.find(field => field.key === 'attributes.proof.value')?.analysis).toMatchObject({
    field: { id: 'attribute:proof.value' },
    numeric: true
  });
  expect(fields.find(field => field.key === 'attributes.text')?.analysis?.numeric).toBe(false);
  expect(fields.find(field => field.key === 'attributes.nested.value')?.analysis).toBeUndefined();
});
it('offers explicit field analysis and keeps a rejected callback menu open', async () => {
  const analysis = {
    field: { id: 'attribute:proof.value', source: 'attribute' as const, key: 'proof.value' },
    numeric: true
  };
  const callback = vi.fn(() => false);
  render(
    <I18nextProvider i18n={i18n}>
      <LogFieldMenu field={{ key: 'attributes.proof.value', value: '12', analysis }} onAnalyzeLogField={callback} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(
    await screen.findByRole('menuitem', {
      name: i18n.t('explore.logFieldMenu.graph', { field: '@proof.value' })
    })
  );
  expect(callback).toHaveBeenCalledWith(analysis, 'graph');
  expect(callback).toHaveBeenCalledTimes(1);
  // Native visibility is covered by the production-built browser fixture.
  expect(screen.getByRole('menu')).toBeInTheDocument();
  expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  callback.mockReturnValue(true);
  fireEvent.click(
    screen.getByRole('menuitem', { name: i18n.t('explore.logFieldMenu.groupBy', { field: '@proof.value' }) })
  );
  expect(callback).toHaveBeenLastCalledWith(analysis, 'group');
  expect(callback).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
});
it('disables both string graph and group actions when existing analysis must be preserved', async () => {
  const callback = vi.fn(() => true);
  const field = {
    key: 'attributes.status',
    value: 'ok',
    analysis: { field: { id: 'attribute:status', source: 'attribute' as const, key: 'status' }, numeric: false }
  };
  render(
    <I18nextProvider i18n={i18n}>
      <LogFieldMenu field={field} onAnalyzeLogField={callback} logAnalysisDisabledReason="existing-analysis" />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button'));
  const item = await screen.findByRole('menuitem', {
    name: new RegExp(i18n.t('explore.logFieldMenu.groupBy', { field: '@status' }))
  });
  expect(item).toHaveAttribute('aria-disabled', 'true');
  expect(item).toHaveTextContent(i18n.t('explore.logFieldMenu.analysisExisting'));
  expect(screen.queryByText(i18n.t('explore.logFieldMenu.analyzeMeasure', { field: '@status' }))).toBeNull();
  const graph = screen.getByRole('menuitem', {
    name: new RegExp(i18n.t('explore.logFieldMenu.graph', { field: '@status' }))
  });
  expect(graph).toHaveAttribute('aria-disabled', 'true');
  expect(graph).toHaveTextContent(i18n.t('explore.logFieldMenu.analysisExisting'));
  fireEvent.click(item);
  fireEvent.click(graph);
  expect(callback).not.toHaveBeenCalled();
  expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
});

it('labels built-in severity for analysis and filtering without changing either target', async () => {
  const onAnalyzeLogField = vi.fn(() => true);
  const onAddLogFilter = vi.fn(() => true);
  const analysis = {
    field: { id: 'builtin:severityCategory', source: 'builtin' as const, key: 'severityCategory' },
    numeric: false
  };
  const filter = { scope: 'builtin' as const, key: 'status', value: 'ERROR' };
  render(
    <I18nextProvider i18n={i18n}>
      <LogFieldMenu
        field={{ key: 'severity', value: 'ERROR', analysis, filter }}
        onAnalyzeLogField={onAnalyzeLogField}
        onAddLogFilter={onAddLogFilter}
      />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button'));
  const label = 'status';
  fireEvent.click(
    await screen.findByRole('menuitem', { name: i18n.t('explore.logFieldMenu.graph', { field: label }) })
  );
  expect(onAnalyzeLogField).toHaveBeenCalledWith(analysis, 'graph');
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(
    await screen.findByRole('menuitem', { name: i18n.t('explore.perses.includeField', { field: label }) })
  );
  expect(onAddLogFilter).toHaveBeenCalledWith(filter, '=');
});
