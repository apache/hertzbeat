import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NumberStepper } from './number-stepper';

describe('NumberStepper', () => {
  it('renders compact HertzBeat UI controls without native number spinners', () => {
    const html = renderToStaticMarkup(<NumberStepper name="wait" min="0" step="30" value="30" onValueChange={() => {}} />);

    expect(html).toContain('data-hz-number-stepper-owner="hertzbeat-ui-number-stepper"');
    expect(html).toContain('data-hz-number-stepper-input="true"');
    expect(html).toContain('data-hz-number-stepper-action="decrement"');
    expect(html).toContain('data-hz-number-stepper-action="increment"');
    expect(html).toContain('>Decrease<');
    expect(html).toContain('>Increase<');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('rounded-[3px]');
    expect(html).not.toContain('type="number"');
  });
});
