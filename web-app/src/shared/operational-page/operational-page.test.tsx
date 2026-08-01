/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  OperationalCommandBar,
  OperationalFormActions,
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalSection,
  OperationalStatePanel
} from './operational-page';

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
});
