/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExploreSourceSelector } from './explore-source-selector';

const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
describe('source selector', () => {
  it('only offers external and self and shows the self internal-data rule', () => {
    const onChange = vi.fn();
    render(
      <ExploreSourceSelector source="self" selfAccessible state="ready" t={t} onChange={onChange} retry={vi.fn()} />
    );
    const hint = screen.getByRole('status');
    expect(hint).toHaveTextContent('exploreSource.selfHint');
    expect(hint).toHaveAttribute('title', 'exploreSource.selfDetails');
    const controls = screen.getByRole('combobox').closest('[data-telemetry-source]');
    expect(controls).not.toContainElement(hint);
    expect(controls?.parentElement).toBe(hint.parentElement);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(screen.queryByText('all')).not.toBeInTheDocument();
  });
  it.each(['unconfigured', 'forbidden', 'unready', 'unavailable', 'metricsUnavailable'])(
    'displays %s explicitly',
    state => {
      render(
        <ExploreSourceSelector
          source="self"
          selfAccessible={false}
          state={state}
          t={t}
          onChange={vi.fn()}
          retry={vi.fn()}
        />
      );
      expect(screen.getByRole('status')).toHaveTextContent(`exploreSource.${state}`);
      expect(screen.getByRole('button')).toHaveTextContent('common.retry');
    }
  );
});
