/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BulletinDraft } from '../model/bulletin-model';
import { BulletinEditor } from './bulletin-editor';
import metricTreeStyles from './bulletin-metric-tree.module.css?raw';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const tree = [{
  key: '["metric","summary"]', title: 'Summary', isLeaf: false as const, metric: 'summary',
  children: [
    { key: '["field","summary","status"]', title: 'Status', isLeaf: true as const,
      metric: 'summary', field: 'status' },
    { key: '["field","summary","responseTime"]', title: 'Response time', isLeaf: true as const,
      metric: 'summary', field: 'responseTime' }
  ]
}];

describe('Bulletin editor metric Tree', () => {
  afterEach(cleanup);

  it('keeps large application hierarchies inside a bounded scrolling field', () => {
    expect(metricTreeStyles).toContain('max-height: 260px');
    expect(metricTreeStyles).toContain('overflow: auto');
    expect(metricTreeStyles).toContain('var(--ant-color-border)');
  });

  it('disables application changes while editing and preserves fields when monitors change', () => {
    const onChange = vi.fn();
    renderEditor({ onChange });

    expect(document.querySelectorAll('.ant-select-disabled')).toHaveLength(1);
    fireEvent.mouseDown(screen.getByText('prod'));
    fireEvent.click(screen.getByText('backup'));
    expect(onChange).toHaveBeenLastCalledWith({ monitorIds: [1, 2] });
  });

  it('clears monitor and field selections when a create draft changes application', () => {
    const onChange = vi.fn();
    renderEditor({ onChange, editing: false });

    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]!);
    fireEvent.click(screen.getByText('Redis'));
    expect(onChange).toHaveBeenCalledWith({ app: 'redis', monitorIds: [], fields: {} });
  });

  it('uses real cascading Tree checkboxes for select-all, partial selection, and uncheck-all', () => {
    const onChange = vi.fn();
    const { rerender } = renderEditor({ onChange });
    const checkboxes = () => [...document.querySelectorAll<HTMLElement>('.ant-tree-checkbox')];

    fireEvent.click(checkboxes()[0]!);
    expect(onChange).toHaveBeenLastCalledWith({ fields: { summary: ['responseTime', 'status'] } });

    rerender(editor({ onChange, fields: { summary: ['status'] } }));
    expect(document.querySelector('.ant-tree-checkbox-indeterminate')).toBeInTheDocument();
    fireEvent.click(checkboxes()[1]!);
    expect(onChange).toHaveBeenLastCalledWith({ fields: {} });

    rerender(editor({ onChange, fields: { summary: ['status', 'responseTime'] } }));
    fireEvent.click(checkboxes()[0]!);
    expect(onChange).toHaveBeenLastCalledWith({ fields: {} });
  });

  it('shows a repairable warning for removed fields and blocks save until selection is valid', () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    renderEditor({ onChange, onSave, fieldSelection: 'stale', fields: { summary: ['removed'] } });

    expect(screen.getByText('bulletin.validation')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    fireEvent.click(document.querySelectorAll<HTMLElement>('.ant-tree-checkbox')[1]!);
    expect(onChange).toHaveBeenCalledWith({ fields: { summary: ['status'] } });
  });
});

function renderEditor(options: Partial<Parameters<typeof editor>[0]> = {}) {
  return render(editor(options));
}

function editor({ onChange = vi.fn(), onSave = vi.fn(), fieldSelection = 'valid',
  fields = { summary: ['status'] }, editing = true }: {
  onChange?: (patch: Partial<BulletinDraft>) => void; onSave?: () => void;
  fieldSelection?: 'valid' | 'stale'; fields?: Record<string, string[]>; editing?: boolean;
}) {
  return <BulletinEditor
    draft={{ ...(editing ? { id: 7 } : {}), name: 'Ops', app: 'website', monitorIds: [1], fields }} saving={false}
    dependencies={{ kind: 'ready', fieldSelection, apps: [
      { value: 'website', label: 'Website', hide: false }, { value: 'redis', label: 'Redis', hide: false }],
      monitors: [{ id: 1, name: 'prod', app: 'website' }, { id: 2, name: 'backup', app: 'website' }],
      metrics: [{ name: 'summary', fields: ['status', 'responseTime'] }], metricTree: tree }}
    onClose={vi.fn()} onSave={onSave} onChange={onChange}
  />;
}
