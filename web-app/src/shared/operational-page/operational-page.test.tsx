/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { OperationalPage, OperationalPageHeader } from './operational-page';

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
});
