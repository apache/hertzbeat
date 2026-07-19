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

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { StatusManagementHeader } from './status-management-header';

describe('StatusManagementHeader', () => {
  afterEach(cleanup);

  it('renders stable message keys and uses the caller-owned public route', () => {
    render(<StatusManagementHeader publicStatusHref="/public-status-proof" />);

    expect(screen.getByRole('heading', { name: 'statusManagement.title' })).toBeInTheDocument();
    expect(screen.getByText('statusManagement.description')).toBeInTheDocument();
    const publicStatusLink = screen.getByRole('link', { name: 'statusManagement.openPublicPage' });
    expect(publicStatusLink).toHaveAttribute('href', '/public-status-proof');
    expect(publicStatusLink).toHaveAttribute('target', '_blank');
    expect(publicStatusLink).toHaveAttribute('rel', 'noreferrer');
  });
});
