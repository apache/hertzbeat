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
import { I18nextProvider } from 'react-i18next';
import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { DashboardCategory } from '../model/dashboard-category';
import { DashboardCategoryCarousel } from './dashboard-category-carousel';

describe('React dashboard category carousel', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  const categories: DashboardCategory[] = ['service', 'program', 'db', 'cache', 'os', 'custom'].map(category => ({
    category,
    total: 1,
    available: 1,
    unavailable: 0,
    paused: 0
  }));
  function element(items = categories) {
    return (
      <I18nextProvider i18n={i18n}>
        <DashboardCategoryCarousel categories={items} kind="ready" />
      </I18nextProvider>
    );
  }
  it('renders all six real category summaries through Swiper React', () => {
    const view = render(element());
    expect(view.container.querySelectorAll('.swiper-slide')).toHaveLength(6);
    expect(screen.getByText(i18n.t('monitor.categories.cache'))).toBeVisible();
    expect(screen.getByRole('button', { name: i18n.t('dashboard.carousel.next') })).toBeInTheDocument();
  });
  it('retains slide nodes and status labels during equivalent statistics refreshes', () => {
    const view = render(element());
    const first = view.container.querySelector('.swiper-slide');
    for (let index = 0; index < 3; index++) view.rerender(element(categories.map(category => ({ ...category }))));
    expect(view.container.querySelector('.swiper-slide')).toBe(first);
    expect(view.container.querySelectorAll('.ant-tag')).toHaveLength(18);
  });
  it('supports one category without duplicating slides', () => {
    const view = render(element(categories.slice(0, 1)));
    expect(view.container.querySelectorAll('.swiper-slide')).toHaveLength(1);
  });
  it('does not present invented cards while unavailable or empty', () => {
    const view = render(element([]));
    expect(view.container.querySelector('.swiper')).toBeNull();
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <DashboardCategoryCarousel categories={categories} kind="error" />
      </I18nextProvider>
    );
    expect(view.container.querySelector('.swiper')).toBeNull();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
