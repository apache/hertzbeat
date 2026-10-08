/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExploreShareAction } from './explore-share-action';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);

it('describes a live share as a stream rather than a relative historical window', async () => {
  render(
    <ExploreShareAction
      query={{ signal: 'logs', live: true, timeRange: 'last-30m' }}
      timeWindow={undefined}
      timeZone="UTC"
      dirty={false}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.share.action' }));
  expect(await screen.findByRole('menuitem', { name: 'explore.share.live' })).not.toHaveAttribute(
    'aria-disabled',
    'true'
  );
  expect(screen.queryByRole('menuitem', { name: 'explore.share.relative' })).not.toBeInTheDocument();
});
