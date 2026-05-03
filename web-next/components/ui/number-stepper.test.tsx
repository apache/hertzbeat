import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NumberStepper } from './number-stepper';

describe('NumberStepper', () => {
  it('renders compact cold controls without native number spinners', () => {
    const html = renderToStaticMarkup(<NumberStepper name="wait" min="0" step="30" value="30" onValueChange={() => {}} />);

    expect(html).toContain('data-cold-number-stepper-owner="cold-number-stepper"');
    expect(html).toContain('data-cold-number-stepper-input="true"');
    expect(html).toContain('data-cold-number-stepper-action="decrement"');
    expect(html).toContain('data-cold-number-stepper-action="increment"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('rounded-[3px]');
    expect(html).not.toContain('type="number"');
  });
});
