/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useNoticeReceiverQueryController } from './notice-receiver-query-controller';

describe('notice receiver query controller', () => {
  it('converges the applied query and search draft across Back and Forward', async () => {
    render(
      <MemoryRouter initialEntries={['/settings/notifications/receivers?pageIndex=0&pageSize=8']}>
        <QueryProbe />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Type missing receiver' }));
    expect(screen.getByTestId('draft')).toHaveTextContent('no-such-receiver');
    expect(screen.getByTestId('query')).toHaveTextContent('|0|8');

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('no-such-receiver|0|8'));

    act(() => screen.getByRole('button', { name: 'Back' }).click());
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('|0|8'));
    await waitFor(() => expect(screen.getByTestId('draft')).toBeEmptyDOMElement());

    act(() => screen.getByRole('button', { name: 'Forward' }).click());
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('no-such-receiver|0|8'));
    await waitFor(() => expect(screen.getByTestId('draft')).toHaveTextContent('no-such-receiver'));
  });
});

function QueryProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  const controller = useNoticeReceiverQueryController();
  return (
    <>
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
      <output data-testid="query">{`${controller.query.name}|${controller.query.pageIndex}|${controller.query.pageSize}`}</output>
      <output data-testid="draft">{controller.name}</output>
      <button type="button" onClick={() => controller.setName('no-such-receiver')}>
        Type missing receiver
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
