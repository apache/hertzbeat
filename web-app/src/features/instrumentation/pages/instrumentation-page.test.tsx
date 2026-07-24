/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const controller = vi.hoisted(() => ({
  stage: 'source',
  hasFlowBack: false,
  reset: vi.fn(),
  goBack: vi.fn()
}));
vi.mock('../controller/use-instrumentation-page-controller', () => ({
  useInstrumentationPageController: () => ({
    stage: controller.stage,
    catalogState: 'loading',
    profilesState: 'loading',
    reset: controller.reset,
    goBack: controller.goBack,
    hasFlowBack: controller.hasFlowBack
  })
}));

import { InstrumentationPage } from './instrumentation-page';
import styles from '../components/instrumentation-onboarding.module.css?raw';

afterEach(() => {
  cleanup();
  controller.hasFlowBack = false;
  vi.clearAllMocks();
});

describe('InstrumentationPage immersive onboarding shell', () => {
  it('owns an accessible HertzBeat header, exit action, and three-step progress without a fixed overlay', () => {
    render(
      <MemoryRouter initialEntries={['/observability/integration']}>
        <Routes>
          <Route path="/observability/integration" element={<InstrumentationPage />} />
          <Route path="/dashboard" element={<div>dashboard destination</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('img', { name: 'HertzBeat' })).toHaveAttribute('src', '/assets/logo.svg');
    expect(screen.getByText('HertzBeat')).toBeVisible();
    expect(screen.getAllByText(/^instrumentation\.v2\.stage\./)).toHaveLength(3);
    expect(styles).toMatch(/\.onboardingHeader\s*\{[^}]*position:\s*(?!fixed)/);

    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.action.exit' }));
    expect(screen.getByText('dashboard destination')).toBeVisible();
  });

  it('uses the header Back action inside a started flow without leaving onboarding', () => {
    controller.hasFlowBack = true;
    render(
      <MemoryRouter initialEntries={['/observability/integration']}>
        <Routes>
          <Route path="/observability/integration" element={<InstrumentationPage />} />
          <Route path="/dashboard" element={<div>dashboard destination</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    expect(controller.goBack).toHaveBeenCalledOnce();
    expect(screen.queryByText('dashboard destination')).toBeNull();
  });
});
