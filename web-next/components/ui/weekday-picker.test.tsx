import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WeekdayPicker } from './weekday-picker';

describe('WeekdayPicker', () => {
  it('renders weekday chips as clickable shared checkbox labels', () => {
    const html = renderToStaticMarkup(
      <WeekdayPicker
        name="silence_days[]"
        value="7,1"
        options={[
          { value: 7, label: 'Sunday' },
          { value: 1, label: 'Monday' },
          { value: 2, label: 'Tuesday' }
        ]}
        onChange={() => {}}
      />
    );

    expect(html).toContain('data-cold-weekday-picker-owner="cold-weekday-picker"');
    expect(html).toContain('data-cold-weekday-option="2"');
    expect(html).toContain('<label');
    expect(html).toContain('data-cold-checkbox-click-target="label-shell"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)).toHaveLength(3);
  });
});
