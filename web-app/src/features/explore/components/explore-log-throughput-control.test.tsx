/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { DEFAULT_LOG_ANALYSIS, type LogAnalysisState } from '@/platform/perses';
import { ExploreLogThroughputControl } from './explore-log-throughput-control';
import { ExploreLogAnalysisRepresentations } from './explore-log-analysis-controls';
const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
it('stages throughput and requires None before switching views', () => {
  const query = vi.fn();
  function Subject() {
    const [value, setValue] = useState<LogAnalysisState>({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' });
    return (
      <>
        <ExploreLogThroughputControl value={value} onChange={setValue} t={t} />
        <ExploreLogAnalysisRepresentations
          value={value.representation}
          transform={value.transform}
          onChange={query}
          t={t}
        />
      </>
    );
  }
  render(<Subject />);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('explore.logAnalysis.throughput'));
  expect(screen.getByRole('button', { name: 'explore.logAnalysis.logs' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'explore.logAnalysis.timeseries' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.table' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.toplist' })).not.toBeInTheDocument();
  expect(query).not.toHaveBeenCalled();
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('explore.logAnalysis.transformNone'));
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.logs' }));
  expect(query).toHaveBeenCalledWith('logs');
});
