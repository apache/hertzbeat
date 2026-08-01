/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { render, screen } from '@testing-library/react';
import { Button } from 'antd';
import { describe, expect, it } from 'vitest';

import { RouteStateFrame } from './route-state';

describe('RouteStateFrame', () => {
  it('gives full-page outcomes one semantic state and a real heading', () => {
    render(
      <RouteStateFrame
        kind="error"
        placement="viewport"
        title="Page unavailable"
        description="Retry later."
        headingLevel={1}
        action={<Button>Retry</Button>}
      />
    );

    expect(screen.getByRole('heading', { name: 'Page unavailable', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveAttribute('data-state', 'error');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('alert').closest('[data-route-state-frame]')).toHaveAttribute('data-placement', 'viewport');
  });
});
