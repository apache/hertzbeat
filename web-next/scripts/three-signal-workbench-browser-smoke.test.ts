import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('three-signal browser smoke coverage', () => {
  it('keeps span-event marker selection and lucide event icons covered in the real browser smoke', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/three-signal-workbench-browser-smoke.spec.ts'), 'utf8');

    expect(source).toContain("randomBytes(16).toString('hex')");
    expect(source).not.toContain('TRACE_ID: THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID');
    expect(source).toContain('data-waterfall-event-marker-source="lucide"');
    expect(source).toContain('data-waterfall-event-marker-action="select-span-event"');
    expect(source).toContain(
      '[data-waterfall-event-marker="true"][data-waterfall-event-marker-action="select-span-event"]:not([data-waterfall-minimap-event-marker])'
    );
    expect(source).toContain('data-trace-manage-event-detail="span-event-detail"');
    expect(source).toContain('不是新的跨度，是当前跨度上的时间点');
  });
});
