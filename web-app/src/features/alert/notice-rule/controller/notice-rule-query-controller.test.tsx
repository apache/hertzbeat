/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useNoticeRuleQueryController } from './notice-rule-query-controller';

describe('notice rule query controller', () => {
  it('converges search draft across Push, Back, and Forward', async () => {
    render(
      <MemoryRouter initialEntries={['/settings/notifications/rules?pageIndex=0&pageSize=8']}>
        <Probe />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('missing|missing'));
    act(() => screen.getByRole('button', { name: 'Back' }).click());
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('|'));
    act(() => screen.getByRole('button', { name: 'Forward' }).click());
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('missing|missing'));
  });
});

function Probe() {
  const controller = useNoticeRuleQueryController();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="state">{`${controller.query.name}|${controller.name}`}</output>
      <button type="button" onClick={() => controller.setName('missing')}>
        Type
      </button>
      <button type="button" onClick={controller.search}>
        Search
      </button>
      <button type="button" onClick={() => void navigate(-1)}>
        Back
      </button>
      <button type="button" onClick={() => void navigate(1)}>
        Forward
      </button>
    </>
  );
}
