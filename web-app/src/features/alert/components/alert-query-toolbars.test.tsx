/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { requireHtmlElement } from '@/test/dom-element';

import { AlertGroupToolbar } from './alert-group-toolbar';
import { AlertInhibitToolbar } from './alert-inhibit-toolbar';
import { AlertRuleListToolbar } from './alert-rule-list-controls';
import { AlertSilenceToolbar } from './alert-silence-toolbar';

describe('alert query toolbars', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(cleanup);

  it.each([
    ['groups', groupToolbar()],
    ['inhibitions', inhibitToolbar()],
    ['silences', silenceToolbar()],
    ['rules', ruleToolbar()]
  ])('keeps %s search and query together while refresh stays in the action rail', (_name, toolbar) => {
    const { container } = renderWithI18n(toolbar);
    const commandBar = requireHtmlElement(
      container.querySelector('[data-hb-operational-command-bar]'),
      'Operational command bar'
    );
    const primary = requireHtmlElement(commandBar.querySelector('[data-hb-operational-command-primary]'), 'Filters');
    const secondary = requireHtmlElement(
      commandBar.querySelector('[data-hb-operational-command-secondary]'),
      'Query actions'
    );

    expect(within(primary).getByRole('textbox')).toBeInTheDocument();
    expect(within(primary).getByRole('button', { name: i18n.t('common.query') })).toBeInTheDocument();
    expect(within(secondary).queryByRole('button', { name: i18n.t('common.query') })).not.toBeInTheDocument();
    expect(within(secondary).getByRole('button', { name: i18n.t('common.refresh') })).toBeInTheDocument();
  });
});

function renderWithI18n(element: ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

const noop = vi.fn();

function groupToolbar() {
  return <AlertGroupToolbar refreshing={false} search="" setSearch={noop} submitSearch={noop} refresh={noop} />;
}

function inhibitToolbar() {
  return (
    <AlertInhibitToolbar
      busy={false}
      refreshing={false}
      search=""
      setSearch={noop}
      submitSearch={noop}
      refresh={noop}
    />
  );
}

function silenceToolbar() {
  return <AlertSilenceToolbar refreshing={false} search="" setSearch={noop} submit={noop} refresh={noop} />;
}

function ruleToolbar() {
  return (
    <AlertRuleListToolbar
      busy={false}
      recovering={false}
      refreshing={false}
      search=""
      setSearch={noop}
      submitSearch={noop}
      refresh={noop}
    />
  );
}
