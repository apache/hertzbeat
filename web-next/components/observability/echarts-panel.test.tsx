import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EChartsPanel dataZoom contract', () => {
  it('reports local dataZoom changes without mutating query state itself', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/observability/echarts-panel.tsx'), 'utf8');

    expect(source).toContain('export type EChartsDataZoomRange');
    expect(source).toContain('onDataZoomChange?: (range: EChartsDataZoomRange) => void');
    expect(source).toContain("chart.on('datazoom'");
    expect(source).toContain("chart.off('datazoom'");
    expect(source).toContain('onDataZoomChange?.');
    expect(source).toContain('dataZoomInteractionRef.current');
    expect(source).toContain('onPointerDownCapture');
    expect(source).toContain('preserveDataZoom');
  });
});
