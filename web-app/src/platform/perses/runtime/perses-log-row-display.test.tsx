/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { afterEach, describe, expect, it } from 'vitest';
import { LogRow } from '@perses-dev/logs-table-plugin/lib/components/LogRow/LogRow.js';

const labels = {
  copyOptions: 'Copy options localized',
  copied: 'Copied localized',
  menu: 'Copy menu localized',
  copyTimestamp: 'Copy full localized',
  copyTimestampDescription: 'Timestamp and message localized',
  copyMessage: 'Copy message localized',
  copyMessageDescription: 'Message only localized',
  copyJson: 'Copy JSON localized',
  copyJsonDescription: 'Full entry localized'
};

function renderRow(contentDisplay: 'message' | 'attributes' | 'stack') {
  const log = {
    timestamp: 1_750_000_001,
    line: 'actual body',
    labels: {},
    hertzbeatAttributes: { nested: { field: 'value' } },
    hertzbeatStack: 'Error: failed\n at handler'
  };
  return render(
    <ThemeProvider theme={createTheme()}>
      <LogRow
        log={log}
        index={0}
        isExpanded={false}
        onToggle={() => undefined}
        rowHeight="medium"
        contentDisplay={contentDisplay}
        copyLabels={labels}
      />
    </ThemeProvider>
  );
}

describe('Perses log row display adapter', () => {
  afterEach(cleanup);

  it.each([
    ['message', 'actual body'],
    ['attributes', '{"nested":{"field":"value"}}'],
    ['stack', 'Error: failed\n at handler']
  ] as const)('renders the source-backed %s content mode', (contentDisplay, expected) => {
    renderRow(contentDisplay);
    const text = screen.getByTestId('log-row-container-0').querySelector('.MuiTypography-root');
    expect(text?.textContent).toBe(expected);
    expect(text).toHaveStyle({ minHeight: '67.2px', maxHeight: '67.2px' });
  });

  it('localizes the copy button and every menu row', () => {
    renderRow('message');
    fireEvent.click(screen.getByRole('button', { name: labels.copyOptions }));
    expect(document.querySelector(`[aria-label="${labels.menu}"]`)).not.toBeNull();
    expect(screen.getAllByText(labels.copyTimestamp).length).toBeGreaterThan(0);
    expect(screen.getAllByText(labels.copyTimestampDescription).length).toBeGreaterThan(0);
    expect(screen.getAllByText(labels.copyMessage).length).toBeGreaterThan(0);
    expect(screen.getAllByText(labels.copyMessageDescription).length).toBeGreaterThan(0);
    expect(screen.getAllByText(labels.copyJson).length).toBeGreaterThan(0);
    expect(screen.getAllByText(labels.copyJsonDescription).length).toBeGreaterThan(0);
  });
});
