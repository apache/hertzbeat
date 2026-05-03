import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TraceDetail, TraceSpanNode } from '../../../pojo/Trace';

type TracePreviewFactTone = 'default' | 'accent' | 'error';

interface TracePreviewFact {
  label: string;
  value: string;
  tone: TracePreviewFactTone;
}

@Component({
  selector: 'app-platform-trace-waterfall-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-trace-waterfall-preview.component.html',
  styleUrl: './platform-trace-waterfall-preview.component.less'
})
export class PlatformTraceWaterfallPreviewComponent {
  private readonly timelineTickPercents = [0, 25, 50, 75, 100];

  @Input({ required: true }) traceDetail!: TraceDetail;
  @Input() selectedSpan: TraceSpanNode | null = null;
  @Input() serviceLabel = 'Trace';
  @Input() timelineLabel = '时间线';
  @Input() spanLabel = 'Span';
  @Input() durationLabel = '耗时';
  @Input() currentSpanLabel = '当前跨度';
  @Input() errorSpanLabel = '错误跨度';
  @Input() eventsLabel = '事件';
  @Input() linksLabel = 'Links';

  @Output() readonly spanSelected = new EventEmitter<TraceSpanNode>();

  get stageTitle(): string {
    return this.trimText(this.selectedSpan?.spanName) || this.trimText(this.traceDetail?.rootSpanName) || this.traceDetail?.traceId || '-';
  }

  get stageMeta(): string[] {
    const items = [this.serviceLabel, `· ${this.formatTraceDuration(this.selectedSpan?.durationNanos || this.traceDetail?.durationNanos)}`];
    const selectedSpanId = this.trimText(this.selectedSpan?.spanId);
    if (selectedSpanId != null) {
      items.push(`· ${selectedSpanId.slice(0, 12)}...`);
    }
    return items;
  }

  get facts(): TracePreviewFact[] {
    return [
      {
        label: this.currentSpanLabel,
        value: this.stageTitle,
        tone: 'accent'
      },
      {
        label: this.errorSpanLabel,
        value: String(this.traceDetail?.errorSpanCount || 0),
        tone: (this.traceDetail?.errorSpanCount || 0) > 0 ? 'error' : 'default'
      },
      {
        label: this.eventsLabel,
        value: String((this.selectedSpan?.events || []).length),
        tone: 'default'
      },
      {
        label: this.linksLabel,
        value: String((this.selectedSpan?.links || []).length),
        tone: 'default'
      }
    ];
  }

  get orderedSpans(): TraceSpanNode[] {
    return this.traceDetail?.spans || [];
  }

  get timelineTicks(): Array<{ percent: number; label: string }> {
    const totalDurationMillis = this.getTraceDurationMillis();
    return this.timelineTickPercents.map(percent => ({
      percent,
      label: percent === 0 ? '0 ms' : this.formatTraceDuration((totalDurationMillis * percent * 1_000_000) / 100)
    }));
  }

  selectSpan(span: TraceSpanNode): void {
    this.spanSelected.emit(span);
  }

  getSpanDepth(span: TraceSpanNode): number {
    let depth = 0;
    let parentSpanId = this.trimText(span.parentSpanId);
    const parentMap = new Map(this.orderedSpans.map(item => [item.spanId, item.parentSpanId]));
    while (parentSpanId != null) {
      depth += 1;
      parentSpanId = this.trimText(parentMap.get(parentSpanId));
      if (depth > 32) {
        break;
      }
    }
    return depth;
  }

  isRootSpan(span: TraceSpanNode): boolean {
    return this.trimText(span.parentSpanId) == null;
  }

  isErrorSpan(span: TraceSpanNode): boolean {
    return span.highlighted || span.status === 'error';
  }

  getSpanOffset(span: TraceSpanNode): string {
    const traceStartMillis = this.getTraceStartMillis();
    const spanStartMillis = this.toTraceMillis(span.startTime);
    if (traceStartMillis == null || spanStartMillis == null) {
      return '-';
    }
    return this.formatTraceDuration(Math.max(spanStartMillis - traceStartMillis, 0) * 1_000_000);
  }

  getSpanBarStyle(span: TraceSpanNode): Record<string, string> {
    const totalDurationMillis = this.getTraceDurationMillis();
    const traceStartMillis = this.getTraceStartMillis() || 0;
    const spanStartMillis = this.toTraceMillis(span.startTime) ?? traceStartMillis;
    const spanDurationMillis = Math.max(Number(span.durationNanos || 0) / 1_000_000, 0);
    const offsetMillis = Math.max(spanStartMillis - traceStartMillis, 0);
    const safeTotalDurationMillis = totalDurationMillis > 0 ? totalDurationMillis : Math.max(spanDurationMillis, 1);
    const leftPercent = Math.min((offsetMillis / safeTotalDurationMillis) * 100, 96);
    const widthPercent = Math.max((spanDurationMillis / safeTotalDurationMillis) * 100, 0);
    const cappedWidth = Math.min(widthPercent, 100 - leftPercent);
    return {
      left: `${leftPercent}%`,
      width: `${Math.max(cappedWidth, 0)}%`
    };
  }

  getSpanStartMarkerStyle(span: TraceSpanNode): Record<string, string> {
    const totalDurationMillis = this.getTraceDurationMillis();
    const traceStartMillis = this.getTraceStartMillis() || 0;
    const spanStartMillis = this.toTraceMillis(span.startTime) ?? traceStartMillis;
    const offsetMillis = Math.max(spanStartMillis - traceStartMillis, 0);
    const safeTotalDurationMillis = totalDurationMillis > 0 ? totalDurationMillis : 1;
    return {
      left: `${Math.min((offsetMillis / safeTotalDurationMillis) * 100, 100)}%`
    };
  }

  formatTraceDuration(durationNanos?: number | null): string {
    if (durationNanos == null || durationNanos <= 0) {
      return '-';
    }
    const millis = durationNanos / 1_000_000;
    if (millis >= 1000) {
      return `${(millis / 1000).toFixed(2)} s`;
    }
    return `${millis.toFixed(2)} ms`;
  }

  private getTraceDurationMillis(): number {
    return Math.max(Number(this.traceDetail?.durationNanos || 0) / 1_000_000, 1);
  }

  private getTraceStartMillis(): number | undefined {
    const start = Number(this.traceDetail?.startTime);
    return Number.isFinite(start) && start > 0 ? start : undefined;
  }

  private toTraceMillis(value?: number | string | null): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
  }

  private trimText(value?: string | null): string | undefined {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
}
