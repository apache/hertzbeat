/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StatusComponent } from '../model/status-management-contract';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { ComponentResults } from './status-management-results';

const component: StatusComponent = {
  id: 4,
  orgId: 1,
  name: 'API',
  method: 0,
  configState: 0,
  state: 0
};

describe('Status management results', () => {
  afterEach(cleanup);

  it('disables row actions and an already-open delete confirmation while a command runs', () => {
    const onDelete = vi.fn();
    const view = render(
      <ComponentResults
        state={{ kind: 'ready', records: [component] }}
        commandLocked={false}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'statusManagement.delete' }));
    const confirm = screen.getByRole('button', { name: 'OK' });
    expect(confirm).toBeEnabled();

    view.rerender(
      <ComponentResults
        state={{ kind: 'ready', records: [component] }}
        commandLocked
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'statusManagement.delete' })).toBeDisabled();
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
