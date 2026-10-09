/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LogsQueryAuthoring } from './explore-logs-query-authoring';

vi.mock('../components/explore-logs-forms', () => ({ ExploreLogsQueryForm: () => <div>Search</div> }));
vi.mock('../components/explore-active-filters', () => ({
  ExploreActiveFilters: ({
    query,
    removeFilter,
    removeFilters
  }: {
    query: { resourceFilter?: string; attributeFilter?: string };
    removeFilter: (key: 'resourceFilter') => boolean;
    removeFilters?: (keys: ('resourceFilter' | 'attributeFilter')[]) => void;
  }) =>
    query.resourceFilter || query.attributeFilter ? (
      <div>
        <span>Active filter: {query.resourceFilter || query.attributeFilter}</span>
        <button type="button" onClick={() => removeFilter('resourceFilter')}>
          Remove one filter
        </button>
        <button type="button" onClick={() => removeFilters?.(['resourceFilter', 'attributeFilter'])}>
          Clear filters
        </button>
      </div>
    ) : null
}));
vi.mock('../controller/use-log-facets', () => ({ useLogFacetCatalog: () => ({ fields: { state: 'idle' } }) }));
vi.mock('./explore-log-authoring', () => ({ ExploreLogAuthoring: () => <div>Display</div> }));
afterEach(cleanup);

function subject(live: boolean, logRecordUid?: string, resourceFilter?: string) {
  const applyLogPatch = vi.fn(() => true);
  const props = {
    controller: {
      query: { signal: 'logs', live, logRecordUid, resourceFilter },
      submission: {
        draft: { signal: 'logs' },
        removeFilter: vi.fn(),
        removeFilters: vi.fn(),
        applyLogPatch
      },
      updateManualQuery: vi.fn()
    },
    command: { queryRef: { current: null } },
    t: vi.fn(() => 'label'),
    inspectorAnalysis: { focusIntent: undefined, onFocused: vi.fn() },
    openComparison: vi.fn(),
    setCalculatedOpen: vi.fn(),
    queryActions: <button type="button">Query actions</button>
  } as unknown as ComponentProps<typeof LogsQueryAuthoring>;
  return { ...render(<LogsQueryAuthoring {...props} />), applyLogPatch };
}

describe('Logs query authoring', () => {
  it('keeps Query actions accessible when the Display row is absent in live mode', () => {
    subject(true, 'record-1');
    expect(screen.getByRole('button', { name: 'Query actions' })).toBeInTheDocument();
  });

  it.each([true, false])('keeps active legacy filters visible when live=%s', live => {
    subject(live, undefined, 'host.name = "host"');
    expect(screen.getByText('Active filter: host.name = "host"')).toBeInTheDocument();
  });

  it('applies one log chip removal through the transactional patch path', () => {
    const { applyLogPatch } = subject(true, undefined, 'host.name = "host"');
    fireEvent.click(screen.getByRole('button', { name: 'Remove one filter' }));
    expect(applyLogPatch).toHaveBeenCalledExactlyOnceWith({ resourceFilter: undefined });
  });

  it('applies bulk log chip removal in one transactional patch', () => {
    const { applyLogPatch } = subject(true, undefined, 'host.name = "host"');
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(applyLogPatch).toHaveBeenCalledExactlyOnceWith({
      resourceFilter: undefined,
      attributeFilter: undefined
    });
  });

  it('does not add Query actions outside historical Display mode', () => {
    subject(false);
    expect(screen.queryByRole('button', { name: 'Query actions' })).not.toBeInTheDocument();
  });

  it('keeps Query actions accessible while inspecting one exact log record', () => {
    subject(false, 'record-1');
    expect(screen.getByRole('button', { name: 'Query actions' })).toBeInTheDocument();
  });
});
