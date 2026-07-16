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

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SessionContext } from './session-context';
import { AuthGate } from './auth-gate';

describe('AuthGate', () => {
  it('lets the user retry a failed session request after the backend recovers', () => {
    const retry = vi.fn();
    render(
      <MemoryRouter>
        <SessionContext.Provider value={{ loading: false, retry, session: undefined, unavailable: true }}>
          <AuthGate />
        </SessionContext.Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(retry).toHaveBeenCalledOnce();
  });
});
