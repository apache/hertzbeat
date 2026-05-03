import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TraceDetail } from '../../../pojo/Trace';
import { PlatformTraceWaterfallPreviewComponent } from './platform-trace-waterfall-preview.component';

describe('PlatformTraceWaterfallPreviewComponent', () => {
  let fixture: ComponentFixture<PlatformTraceWaterfallPreviewComponent>;
  let component: PlatformTraceWaterfallPreviewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformTraceWaterfallPreviewComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformTraceWaterfallPreviewComponent);
    component = fixture.componentInstance;
    component.serviceLabel = 'recommendation';
    component.traceDetail = {
      traceId: 'trace-123',
      rootSpanName: 'GET /checkout',
      serviceName: 'recommendation',
      startTime: 1_710_000_000_000,
      durationNanos: 5_000_000,
      errorSpanCount: 1,
      spans: [
        {
          traceId: 'trace-123',
          spanId: 'span-1',
          spanName: 'GET /checkout',
          durationNanos: 5_000_000,
          startTime: 1_710_000_000_000,
          status: 'ok',
          highlighted: false,
          events: [],
          links: []
        },
        {
          traceId: 'trace-123',
          spanId: 'span-2',
          parentSpanId: 'span-1',
          spanName: 'SELECT cart_items',
          durationNanos: 2_000_000,
          startTime: 1_710_000_000_500,
          status: 'error',
          highlighted: true,
          events: [{ name: 'db.query' } as any],
          links: [{ traceId: 'trace-2', spanId: 'span-3' } as any]
        }
      ]
    } as TraceDetail;
    component.selectedSpan = component.traceDetail.spans[1];
    fixture.detectChanges();
  });

  it('should render stage facts and emit selected spans', () => {
    const root = fixture.nativeElement as HTMLElement;
    const emitted: string[] = [];
    component.spanSelected.subscribe(span => emitted.push(span.spanId));

    expect(root.querySelector('.platform-trace-preview-stage-title')?.textContent).toContain('SELECT cart_items');
    expect(root.querySelectorAll('.platform-trace-preview-stage-fact').length).toBe(4);

    (root.querySelectorAll('.platform-trace-preview-span-row')[0] as HTMLButtonElement).click();
    expect(emitted).toEqual(['span-1']);
  });
});
