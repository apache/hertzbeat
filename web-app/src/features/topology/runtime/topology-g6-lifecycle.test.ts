/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { removeGeneratedCanvasTabStops } from './topology-g6-lifecycle';

describe('Topology G6 accessibility lifecycle', () => {
  it('keeps generated drawing surfaces out of the positive tab order', () => {
    const layer = document.createElement('div');
    const interactiveCanvas = document.createElement('canvas');
    const decorativeCanvas = document.createElement('canvas');
    interactiveCanvas.tabIndex = 1;
    decorativeCanvas.tabIndex = 1;
    layer.append(interactiveCanvas, decorativeCanvas);

    removeGeneratedCanvasTabStops(layer);

    expect(interactiveCanvas).toHaveAttribute('tabindex', '-1');
    expect(decorativeCanvas).toHaveAttribute('tabindex', '-1');
  });
});
