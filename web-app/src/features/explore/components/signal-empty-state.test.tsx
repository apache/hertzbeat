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

import type { FormEvent } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SignalEmptyState } from './signal-result-frame';

afterEach(cleanup);

it('returns focus to its own query form without submitting or replacing the draft', () => {
  const submit = vi.fn((event: FormEvent) => event.preventDefault());
  render(
    <>
      <form aria-label="Other query" tabIndex={-1} />
      <div data-explore-query-layout="split">
        <form aria-label="Query" tabIndex={-1} onSubmit={submit}>
          <input aria-label="Draft" defaultValue="service:checkout error" />
        </form>
        <SignalEmptyState title="No matches" hint="Review filters and time." reviewQueryLabel="Review query" />
      </div>
    </>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Review query' }));
  expect(screen.getByRole('form', { name: 'Query' })).toHaveFocus();
  expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('service:checkout error');
  expect(submit).not.toHaveBeenCalled();
});

it('does not invent a recovery action for other empty-state uses', () => {
  render(<SignalEmptyState title="No matches" hint="No data." />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
