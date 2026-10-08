/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis } from '@/platform/perses';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';

import { draftFromQuery, type LogExploreSubmissionDraft } from '../model/explore-submission-model';
import { ExploreLogAnalysisSettings } from './explore-log-analysis-settings';
import { ExploreLogAuthoringRepresentation } from './explore-log-authoring-representation';
import { ExploreLogsComparisonDrawer } from './explore-logs-comparison-drawer';

const t = ((key: string) => key) as TFunction;
const draft = draftFromQuery({ signal: 'logs', timeRange: 'last-30m' }) as LogExploreSubmissionDraft;

afterEach(cleanup);

describe('Logs advanced authoring drawers', () => {
  it('offers only the Logs and Timeseries result views', () => {
    const value = { ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' as const };
    const encoded = encodeLogAnalysis(value);
    render(
      <ExploreLogAuthoringRepresentation
        current={value}
        raw={encoded}
        draftRaw={encoded}
        fields={[{ id: 'attribute:status', source: 'attribute', key: 'status' }]}
        onRepresentationChange={vi.fn()}
        onSettingsApply={vi.fn(() => true)}
        t={t}
      />
    );
    expect(screen.getByRole('button', { name: 'explore.logAnalysis.logs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'explore.logAnalysis.timeseries' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'explore.logAnalysis.table' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'explore.logAnalysis.toplist' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'explore.logAnalysis.by' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.label' }));
    expect(screen.getByRole('combobox', { name: 'explore.logAnalysis.by' })).toBeInTheDocument();
  });

  it('keeps malformed applied analysis intact until settings recovery', () => {
    const onRepresentationChange = vi.fn();
    render(
      <ExploreLogAuthoringRepresentation
        current={DEFAULT_LOG_ANALYSIS}
        raw="{invalid-json"
        draftRaw="{invalid-json"
        fields={[]}
        onRepresentationChange={onRepresentationChange}
        onSettingsApply={vi.fn()}
        t={t}
      />
    );
    expect(screen.getByRole('button', { name: 'explore.logAnalysis.timeseries' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'explore.logAnalysis.label' })).toBeEnabled();
    expect(onRepresentationChange).not.toHaveBeenCalled();
  });
  it('keeps malformed comparison analysis untouched until explicit recovery and Confirm', () => {
    const updateField = vi.fn();
    const close = vi.fn();
    render(
      <ExploreLogsComparisonDrawer
        draft={{ ...draft, logAnalysis: '{invalid-json' }}
        updateField={updateField}
        close={close}
        t={t}
      />
    );
    const dialog = screen.getByRole('dialog', { name: 'explore.logComparison.label' });
    expect(within(dialog).getByRole('button', { name: 'common.confirm' })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'explore.logComparison.add' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }));
    expect(updateField).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    fireEvent.click(within(dialog).getByRole('button', { name: 'explore.logAnalysis.reset' }));
    expect(within(dialog).getByRole('button', { name: 'common.confirm' })).toBeEnabled();
  });

  it('rejects an invalid comparison formula before it reaches the query draft', () => {
    const updateField = vi.fn();
    render(<ExploreLogsComparisonDrawer {...{ draft, updateField, t }} close={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'explore.logComparison.label' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'explore.logComparison.addFormula' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'explore.logComparison.formula' }), {
      target: { value: 'b/' }
    });
    expect(within(dialog).getByRole('button', { name: 'common.confirm' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: 'explore.logComparison.formula' })).toHaveValue('b/');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'explore.logComparison.formula' }), {
      target: { value: 'b/a' }
    });
    expect(within(dialog).getByRole('button', { name: 'common.confirm' })).toBeEnabled();
    expect(updateField).not.toHaveBeenCalled();
  });

  it('keeps analysis settings local on Cancel and requires explicit reset for malformed raw', () => {
    const onChange = vi.fn();
    render(
      <ExploreLogAnalysisSettings
        value={DEFAULT_LOG_ANALYSIS}
        fields={[]}
        onChange={onChange}
        pending={false}
        invalid
        rawDraft="{invalid-json"
        t={t}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.label' }));
    const dialog = screen.getByRole('dialog', { name: 'explore.logAnalysis.label' });
    expect(within(dialog).getByRole('button', { name: 'common.confirm' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.label' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'explore.logAnalysis.reset' }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'common.confirm' })).toBeEnabled();
  });
});
