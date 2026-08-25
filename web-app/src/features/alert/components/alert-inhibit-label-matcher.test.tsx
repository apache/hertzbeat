/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertInhibitLabelMatcher } from './alert-inhibit-label-matcher';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('AlertInhibitLabelMatcher', () => {
  afterEach(cleanup);

  it('commits a source-compatible matcher after searchable key and value selection', async () => {
    const change = vi.fn();
    render(
      <AlertInhibitLabelMatcher
        value="environment:staging"
        disabled={false}
        invalid={false}
        suggestions={{
          kind: 'received',
          keys: ['environment'],
          catalog: { keys: ['environment'], valuesByKey: { environment: ['production'] } }
        }}
        change={change}
      />
    );

    const value = screen.getByRole('combobox', { name: 'alertInhibits.matcherValue' });
    fireEvent.mouseDown(value.closest('.ant-select-selector')!);
    expect(await screen.findByRole('option', { name: 'production' })).toBeInTheDocument();
    fireEvent.click(document.querySelector('.ant-select-item-option[title="production"]')!);

    expect(change).toHaveBeenLastCalledWith('environment:production');
  });

  it('exposes incomplete rows to validation and keeps source add/remove controls', () => {
    const change = vi.fn();
    render(
      <AlertInhibitLabelMatcher
        value="severity:critical"
        disabled={false}
        invalid
        suggestions={{ kind: 'fallback', keys: ['severity'] }}
        change={change}
      />
    );

    expect(screen.getByRole('combobox', { name: 'alertInhibits.matcherKey' })).toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'alertInhibits.addMatcher' }));
    expect(change).toHaveBeenLastCalledWith('severity:critical, :');
    expect(screen.getAllByRole('combobox', { name: 'alertInhibits.matcherKey' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'alertInhibits.removeMatcher' })[0]!);
    expect(change).toHaveBeenLastCalledWith(':');
  });
});
