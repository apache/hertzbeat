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
  catalogState: 'initial-loading',
  profilesState: 'initial-loading',
  catalog: undefined as object | undefined,
  draft: {},
  initializationRetrying: false,
  hasFlowBack: false,
  canContinueSource: false,
  tokenAcknowledgementRequired: false,
  sourceDirectoryRevision: 0,
  reset: vi.fn(),
  goBack: vi.fn(),
  retryInitialization: vi.fn(),
  chooseSource: vi.fn(),
  answerApplication: vi.fn(),
  setStage: vi.fn()
}));
vi.mock('../controller/use-instrumentation-page-controller', () => ({
  useInstrumentationPageController: () => controller
}));
vi.mock('../components/instrumentation-source-step', () => ({
  InstrumentationSourceStep: () => <div>source directory</div>
}));

import { InstrumentationPage } from './instrumentation-page';
import styles from '../components/instrumentation-onboarding.module.css?raw';

afterEach(() => {
  cleanup();
  controller.stage = 'source';
  controller.catalogState = 'initial-loading';
  controller.profilesState = 'initial-loading';
  controller.catalog = undefined;
  controller.draft = {};
  controller.initializationRetrying = false;
  controller.hasFlowBack = false;
  controller.canContinueSource = false;
  controller.tokenAcknowledgementRequired = false;
  vi.clearAllMocks();
});

describe('InstrumentationPage immersive onboarding shell', () => {
  it('owns an accessible HertzBeat header, exit action, and two-step progress without a context stage', () => {
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
    expect(screen.getAllByText(/^instrumentation\.v2\.stage\./)).toHaveLength(2);
    expect(screen.queryByText('instrumentation.v2.stage.context')).toBeNull();
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

  it('blocks Back and Start Over while a generated token still needs acknowledgement', () => {
    controller.hasFlowBack = true;
    controller.tokenAcknowledgementRequired = true;
    renderPage();

    expect(screen.getByRole('button', { name: 'common.back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'instrumentation.v2.startOver' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.v2.startOver' }));
    expect(controller.goBack).not.toHaveBeenCalled();
    expect(controller.reset).not.toHaveBeenCalled();
  });

  it('renders catalog failure as an operational recovery region while Exit remains available', () => {
    controller.catalogState = 'error';
    controller.profilesState = 'ready';
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('instrumentation.v2.initialization.catalogUnavailable');
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retryInitialization).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.action.exit' }));
    expect(screen.getByText('dashboard destination')).toBeVisible();
  });

  it('keeps the source directory inspectable but blocks Configure while profiles are unavailable', () => {
    controller.catalogState = 'ready';
    controller.profilesState = 'error';
    controller.catalog = {};
    renderPage();

    expect(screen.getByText('source directory')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('instrumentation.v2.initialization.profilesUnavailable');
    expect(screen.getByRole('button', { name: 'instrumentation.action.continue' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeEnabled();
  });

  it('disables repeated metadata recovery while a retry owns the gate', () => {
    controller.catalogState = 'error';
    controller.profilesState = 'retrying';
    controller.initializationRetrying = true;
    renderPage();

    expect(screen.getByRole('button', { name: /common\.retry/ })).toBeDisabled();
  });

  it('keeps retained metadata flow available beside a degraded refresh warning', () => {
    controller.catalogState = 'ready';
    controller.profilesState = 'stale';
    controller.catalog = {};
    controller.canContinueSource = true;
    renderPage();

    expect(screen.getByText('source directory')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('instrumentation.v2.initialization.stale');
    expect(screen.getByRole('button', { name: 'instrumentation.action.continue' })).toBeEnabled();
  });
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/observability/integration']}>
      <Routes>
        <Route path="/observability/integration" element={<InstrumentationPage />} />
        <Route path="/dashboard" element={<div>dashboard destination</div>} />
      </Routes>
    </MemoryRouter>
  );
}
