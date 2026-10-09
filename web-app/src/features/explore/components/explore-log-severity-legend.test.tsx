/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ExploreLogSeverityLegend } from './explore-log-severity-legend';

const statistics = {
  overview: {
    kind: 'ready' as const,
    data: {
      totalCount: 271,
      traceCount: 0,
      debugCount: 0,
      infoCount: 0,
      warnCount: 271,
      errorCount: 0,
      fatalCount: 0
    }
  }
};
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('summarizes observed nonzero severities without offering a second filter action', () => {
  render(<ExploreLogSeverityLegend statistics={statistics} t={i18n.t} />);
  const summary = screen.getByRole('list', { name: i18n.t('exploreLog.statisticsScope') });
  expect(summary).toHaveTextContent(`${i18n.t('exploreLog.statistics.total')}271`);
  expect(summary).toHaveTextContent(`${i18n.t('exploreLog.statistics.warn')}271`);
  expect(summary).not.toHaveTextContent(i18n.t('exploreLog.statistics.trace'));
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('shows only the real count for a calculated trend without inventing severity counts', () => {
  render(
    <ExploreLogSeverityLegend statistics={{ overview: { kind: 'count_only', data: { totalCount: 193 } } }} t={i18n.t} />
  );
  const summary = screen.getByRole('list', { name: i18n.t('exploreLog.statisticsScope') });
  expect(summary).toHaveTextContent(`${i18n.t('exploreLog.statistics.total')}193`);
  expect(summary.children).toHaveLength(1);
  expect(summary).not.toHaveTextContent(i18n.t('exploreLog.statistics.warn'));
});
