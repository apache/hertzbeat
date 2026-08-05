/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OperationalCommandBar,
  OperationalFormActions,
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalSection,
  OperationalStatePanel
} from './operational-page';
import { OperationalSearchControl } from './operational-search-control';
import operationalPageStyles from './operational-page.module.css?raw';

describe('OperationalPage', () => {
  afterEach(cleanup);

  it('owns one semantic title, description, action region, and 20px page rhythm hook', () => {
    render(
      <OperationalPage>
        <OperationalPageHeader
          title="Monitors"
          titleId="monitor-heading"
          description="Manage monitor definitions"
          actions={<button type="button">Create</button>}
        />
        <div>Results</div>
      </OperationalPage>
    );

    const page = screen.getByText('Results').closest('[data-hb-operational-page]');
    const heading = screen.getByRole('heading', { level: 2, name: 'Monitors' });
    const header = heading.closest('[data-hb-operational-page-header]');
    expect(page).not.toBeNull();
    expect(heading).toHaveAttribute('id', 'monitor-heading');
    expect(header).toContainElement(screen.getByText('Manage monitor definitions'));
    expect(header?.querySelector('[data-hb-operational-page-actions]')).toContainElement(
      screen.getByRole('button', { name: 'Create' })
    );
  });

  it('does not reserve an action region when a page has no header action', () => {
    render(
      <OperationalPage>
        <OperationalPageHeader title="Monitors" description="Manage monitor definitions" />
      </OperationalPage>
    );

    expect(document.querySelector('[data-hb-operational-page-actions]')).not.toBeInTheDocument();
  });

  it('owns the command, result, and section regions used by data-heavy pages', () => {
    render(
      <OperationalPage mode="data">
        <OperationalCommandBar primary={<input aria-label="Search" />} secondary={<button>Refresh</button>} />
        <OperationalResultRegion>
          <OperationalSection title="Recent alerts" description="Newest first" actions={<button>View all</button>}>
            <div>Alert evidence</div>
          </OperationalSection>
        </OperationalResultRegion>
      </OperationalPage>
    );

    expect(document.querySelector('[data-hb-operational-page]')).toHaveAttribute('data-mode', 'data');
    expect(document.querySelector('[data-hb-operational-command-bar]')).toContainElement(
      screen.getByRole('textbox', { name: 'Search' })
    );
    expect(document.querySelector('[data-hb-operational-result-region]')).toContainElement(
      screen.getByText('Alert evidence')
    );
    const section = screen.getByRole('region', { name: 'Recent alerts' });
    expect(section).toHaveTextContent('Newest first');
    expect(section).toContainElement(screen.getByRole('button', { name: 'View all' }));
  });

  it('renders compact semantic states without a decorative empty illustration', () => {
    const view = render(
      <OperationalStatePanel
        kind="no-match"
        title="No monitors match"
        description="Change or clear the filters."
        action={<button>Clear filters</button>}
      />
    );

    const state = screen.getByRole('status', { name: 'No monitors match' });
    expect(state).toHaveAttribute('data-state', 'no-match');
    expect(state).toHaveTextContent('Change or clear the filters.');
    expect(state).toContainElement(screen.getByRole('button', { name: 'Clear filters' }));
    expect(document.querySelector('.ant-empty-image')).not.toBeInTheDocument();

    view.rerender(<OperationalStatePanel kind="error" title="Monitor query failed" />);
    expect(screen.getByRole('alert', { name: 'Monitor query failed' })).toHaveAttribute('data-state', 'error');
  });

  it('keeps form actions in a stable shared footer', () => {
    render(
      <OperationalPage mode="form">
        <OperationalFormActions>
          <button type="submit">Save</button>
          <button type="button">Cancel</button>
        </OperationalFormActions>
      </OperationalPage>
    );

    expect(document.querySelector('[data-hb-operational-page]')).toHaveAttribute('data-mode', 'form');
    const actions = document.querySelector('[data-hb-operational-form-actions]');
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Save' }));
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('centers the bounded form workspace inside the available content area', () => {
    expect(operationalPageStyles).toMatch(
      /\.page\[data-mode='form'\]\s*\{[^}]*max-width:\s*840px;[^}]*margin-inline:\s*auto;/s
    );
  });

  it('lets wide result children shrink so their own table scroller and fixed columns stay in the viewport', () => {
    expect(operationalPageStyles).toMatch(/\.resultRegion\s*>\s*\*\s*\{[^}]*min-width:\s*0;/s);
  });

  it('uses one separator when a command bar is nested inside a section', () => {
    expect(operationalPageStyles).toMatch(/\.sectionBody\s+\.commandBar\s*\{[^}]*border-top:\s*0;/s);
  });

  it('caps a single search field without constraining multi-filter toolbars', () => {
    expect(operationalPageStyles).toMatch(
      /\.commandBar\[role='search'\][\s\S]*?\.commandPrimary\s*>[\s\S]*?width:\s*min\(480px,\s*100%\);/
    );
  });

  it('keeps search input and its explicit submit action in one compact control', () => {
    const change = vi.fn();
    const submit = vi.fn();
    render(
      <OperationalSearchControl
        ariaLabel="Search boards"
        placeholder="Search boards"
        submitLabel="Query"
        value=""
        onChange={change}
        onSubmit={submit}
      />
    );

    const input = screen.getByRole('textbox', { name: 'Search boards' });
    fireEvent.change(input, { target: { value: 'mysql' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Query' }));

    expect(change).toHaveBeenCalledWith('mysql');
    expect(submit).toHaveBeenCalledTimes(2);
    expect(operationalPageStyles).toMatch(/\.searchControl\s*\{[^}]*width:\s*min\(480px,\s*100%\);/s);
  });
});
