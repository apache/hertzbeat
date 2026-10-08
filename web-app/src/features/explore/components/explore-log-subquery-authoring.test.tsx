/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { defaultLogSubquery } from '../model/explore-log-subquery';
import { LogFacetVisibilityContext } from './explore-log-facet-visibility-context';
import { ExploreLogSubqueryAuthoring } from './explore-log-subquery-authoring';

const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
it('edits an independent child query as a draft and removes the row explicitly', () => {
  let current = defaultLogSubquery();
  const onChange = vi.fn(next => {
    current = next;
  });
  const onRemove = vi.fn();
  const onSubmit = vi.fn();
  const { rerender } = render(
    <ExploreLogSubqueryAuthoring value={current} t={t} onChange={onChange} onRemove={onRemove} onSubmit={onSubmit} />
  );
  const row = screen.getByRole('group', { name: 'explore.logSubquery.label' });
  expect(row).toHaveTextContent(
    /explore\.logSubquery\.where.*explore\.logSubquery\.from.*explore\.logSubquery\.sortedBy.*explore\.logSubquery\.countOf.*explore\.logSubquery\.allLogs/
  );
  expect(within(row).queryByText('explore.logSubquery.mainField')).not.toBeInTheDocument();
  fireEvent.mouseDown(within(row).getByRole('combobox', { name: 'explore.logSubquery.operator' }));
  fireEvent.click(screen.getByText('explore.logSubquery.notIn'));
  rerender(
    <ExploreLogSubqueryAuthoring value={current} t={t} onChange={onChange} onRemove={onRemove} onSubmit={onSubmit} />
  );
  expect(current.operator).toBe('not_in');
  fireEvent.mouseDown(within(row).getByRole('combobox', { name: 'explore.logSubquery.rank' }));
  fireEvent.click(screen.getByText('explore.logSubquery.bottom'));
  expect(current.rank.direction).toBe('bottom');
  expect(onSubmit).not.toHaveBeenCalled();
  const editorElement = document.querySelector('[data-log-search-input]');
  expect(editorElement).toHaveAttribute('data-log-search-syntax', 'structured-v1');
  const editor = EditorView.findFromDOM(editorElement as HTMLElement);
  if (!editor) throw new Error('Expected child search editor');
  editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'service:node_repl' } });
  expect(current.child.search).toBe('service:node_repl');
  fireEvent.keyDown(editor.contentDOM, { key: 'Enter', isComposing: true, keyCode: 229 });
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.keyDown(editor.contentDOM, { key: 'Enter' });
  expect(onSubmit).toHaveBeenCalledOnce();
  fireEvent.click(within(row).getByRole('button', { name: 'explore.logSubquery.remove' }));
  expect(onRemove).toHaveBeenCalledOnce();
});

it('offers displayed facets and existing selections instead of every discovered field', () => {
  const context = {
    visible: true,
    toggle: vi.fn(),
    availableFacetIds: [
      'builtin:serviceName',
      'resource:host.name',
      'attribute:event.name',
      'attribute:model',
      'attribute:unused'
    ],
    displayedFacetIds: ['builtin:serviceName', 'resource:host.name', 'attribute:event.name'],
    addedFacetIds: ['attribute:event.name'],
    expandedFacetIds: [],
    setAvailableFacetIds: vi.fn(),
    onAddFacet: vi.fn(),
    removeFacet: vi.fn(() => true),
    toggleFacet: vi.fn()
  };
  const value = { ...defaultLogSubquery(), child: { ...defaultLogSubquery().child, field: 'attribute:model' } };
  render(
    <LogFacetVisibilityContext.Provider value={context}>
      <ExploreLogSubqueryAuthoring value={value} t={t} onChange={vi.fn()} onRemove={vi.fn()} />
    </LogFacetVisibilityContext.Provider>
  );
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'explore.logSubquery.mainField' }));
  expect(screen.getByRole('option', { name: 'explore.logFacets.core.host' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '@event.name' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '@model' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: '@unused' })).not.toBeInTheDocument();
});

it('uses the structured query editor and exposes only fields in the ingested catalog for sort metrics', () => {
  const defaults = defaultLogSubquery();
  const value = { ...defaults, rank: { ...defaults.rank, limit: 3 } };
  const onChange = vi.fn();
  render(
    <ExploreLogSubqueryAuthoring
      value={value}
      fields={[
        { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName', scalar: true },
        { id: 'resource:host.name', source: 'resource', key: 'host.name', scalar: true },
        { id: 'resource:tags', source: 'resource', key: 'tags', scalar: false }
      ]}
      suggestions={{ state: 'ready', options: [], requestField: vi.fn() }}
      t={t}
      onChange={onChange}
      onRemove={vi.fn()}
    />
  );

  expect(document.querySelector('[data-log-search-syntax="structured-v1"]')).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'explore.logSubquery.sortedBy' }));
  expect(screen.getByRole('option', { name: 'explore.logSubquery.allLogs' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'explore.logFacets.core.host' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'resource:tags' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('option', { name: 'explore.logFacets.core.host' }));
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      rank: expect.objectContaining({ measure: { function: 'count_distinct', field: 'resource:host.name' } })
    })
  );
  fireEvent.mouseDown(document.body);
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'explore.logSubquery.limit' }));
  expect(screen.getByRole('option', { name: '1K' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '2' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '3' })).toBeInTheDocument();
});
