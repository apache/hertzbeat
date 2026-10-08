/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { ExploreCalculatedFacetValues } from './explore-calculated-facet-values';

const readValues = vi.hoisted(() => vi.fn());
vi.mock('../controller/use-calculated-facet-values', () => ({
  useCalculatedFacetValues: readValues
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(() => {
  cleanup();
  readValues.mockReset();
});

function subject(fieldId: string, value: string | number | boolean) {
  readValues.mockReturnValue({
    values: {
      state: 'ready',
      data: {
        result: {
          kind: 'facet',
          field: fieldId,
          matchingTotal: 3,
          missingOrNullCount: 1,
          values: [{ value, count: 2 }],
          truncated: false
        }
      }
    },
    onRetry: vi.fn()
  });
  const updateField = vi.fn();
  const submit = vi.fn();
  const definitions = '{"version":2}';
  const query = {
    signal: 'logs' as const,
    searchSyntax: 'structured-v2' as const,
    logCalculatedV2: definitions,
    query: 'service:api OR service:worker'
  };
  const controller = {
    query,
    result: {
      kind: 'ready',
      signal: 'logs',
      calculated: { executed: { calculatedFields: { fields: [{ outputs: [{ name: 'seconds', type: 'number' }] }] } } }
    },
    submission: { draft: query, updateField, submit }
  } as unknown as ReturnType<typeof useExplorePageController>;
  render(<ExploreCalculatedFacetValues controller={controller} fieldId={fieldId} fieldLabel={fieldId} enabled />);
  return { updateField, submit };
}

it('shows a typed numeric value without string search and filters through #name', () => {
  const { updateField, submit } = subject('calculated:seconds', 1.5);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByText('explore.logFacets.missing')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logFacets.onlyOrAll' }));
  expect(updateField).toHaveBeenCalledWith({
    field: 'query',
    value: '(service:api OR service:worker) AND #seconds:"1.5"'
  });
  expect(submit).toHaveBeenCalledOnce();
});

it('retains raw text facet search and quotes the selected value', () => {
  const { updateField } = subject('builtin:serviceName', 'api');
  expect(screen.getByRole('textbox')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logFacets.onlyOrAll' }));
  expect(updateField).toHaveBeenCalledWith({
    field: 'query',
    value: '(service:api OR service:worker) AND service:"api"'
  });
});
