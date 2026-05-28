import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EChartsPanel dataZoom contract', () => {
  it('reports local dataZoom changes without mutating query state itself', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/observability/echarts-panel.tsx'), 'utf8');
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(source).toContain('HzEChartsPanel as EChartsPanel');
    expect(source).toContain('HzEChartsDataZoomRange as EChartsDataZoomRange');
    expect(uiSource).toContain('export type HzEChartsDataZoomRange');
    expect(uiSource).toContain('onDataZoomChange?: (range: HzEChartsDataZoomRange) => void');
    expect(uiSource).toContain("chart.on('datazoom'");
    expect(uiSource).toContain("chart.off('datazoom'");
    expect(uiSource).toContain('onDataZoomChange?.');
    expect(uiSource).toContain('dataZoomInteractionRef.current');
    expect(uiSource).toContain('onPointerDownCapture');
    expect(uiSource).toContain('preserveDataZoom');
  });
});
