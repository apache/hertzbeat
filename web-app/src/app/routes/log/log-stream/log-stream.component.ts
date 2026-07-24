/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  Input
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { SharedModule } from '@shared';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerComponent } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { LogEntry } from '../../../pojo/LogEntry';
import { LocalStorageService } from '../../../service/local-storage.service';

interface ExtendedLogEntry {
  original: LogEntry;
  timestamp: Date;
  displayText: string;
  severityColor: string;
}

@Component({
  selector: 'app-log-stream',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    NzCardModule,
    NzInputModule,
    NzAutocompleteModule,
    NzSelectModule,
    NzButtonModule,
    NzTagModule,
    NzToolTipModule,
    NzSwitchModule,
    NzAlertModule,
    NzEmptyModule,
    NzModalModule,
    NzDividerComponent,
    ScrollingModule
  ],
  templateUrl: './log-stream.component.html',
  styleUrl: './log-stream.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogStreamComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() embedded = false;
  // SSE connection and state
  private streamAbortController?: AbortController;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  isConnected: boolean = false;
  isConnecting: boolean = false;

  // Log data - use ring buffer approach
  logEntries: ExtendedLogEntry[] = [];
  maxLogEntries: number = 10000;
  isPaused: boolean = false;
  displayedLogCount: number = 0;

  // Filter properties
  filterSeverityNumber: string = '';
  @Input() filterSeverityText: string = '';
  filterLogContent: string = '';
  @Input() filterTraceId: string = '';
  @Input() filterSpanId: string = '';

  // UI state
  showFilters: boolean = true;

  // Modal state
  isModalVisible: boolean = false;
  selectedLogEntry: ExtendedLogEntry | null = null;

  // Auto scroll state
  userScrolled: boolean = false;
  private scrollTimeout: any;
  private isNearTop: boolean = true;

  // Batch processing for high TPS - use requestAnimationFrame
  private pendingLogs: ExtendedLogEntry[] = [];
  private rafId: number | null = null;
  private lastFlushTime: number = 0;
  private readonly MIN_FLUSH_INTERVAL = 200; // Minimum 200ms between flushes
  private readonly MAX_PENDING_LOGS = 1000; // Drop logs if buffer exceeds this

  // ViewChild for log container
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  constructor(
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.connectToLogStream();
  }

  ngAfterViewInit(): void {
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    this.disconnectFromLogStream();
    this.cleanupScrollListener();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  onReconnect(): void {
    this.logEntries = [];
    this.connectToLogStream();
  }

  private connectToLogStream(): void {
    if (this.streamAbortController) {
      this.disconnectFromLogStream();
    }

    this.isConnecting = true;

    // Build filter parameters
    const filterParams = this.buildFilterParams();
    const url = `/api/logs/sse/subscribe${filterParams ? `?${filterParams}` : ''}`;
    const token = this.localStorageService.getAuthorizationToken();
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const abortController = new AbortController();
    this.streamAbortController = abortController;

    this.ngZone.runOutsideAngular(() => {
      fetch(url, {
        method: 'GET',
        headers,
        signal: abortController.signal
      })
        .then(async response => {
          if (!response.ok) {
            throw new Error(`Log stream request failed with status ${response.status}`);
          }
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Log stream response has no readable body');
          }

          const decoder = new TextDecoder();
          let buffer = '';
          this.ngZone.run(() => {
            this.isConnected = true;
            this.isConnecting = false;
            this.cdr.markForCheck();
          });

          while (!abortController.signal.aborted) {
            const { value, done } = await reader.read();
            if (done) {
              throw new Error('Log stream connection closed');
            }

            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split(/\r?\n\r?\n/);
            buffer = frames.pop() ?? '';

            for (const frame of frames) {
              let eventType = '';
              const dataLines: string[] = [];
              for (const line of frame.split(/\r?\n/)) {
                if (line.startsWith('event:')) {
                  eventType = line.substring(6);
                } else if (line.startsWith('data:')) {
                  dataLines.push(line.substring(5));
                }
              }

              if (eventType !== 'LOG_EVENT' || dataLines.length === 0 || this.isPaused) {
                continue;
              }

              try {
                const logEntry: LogEntry = JSON.parse(dataLines.join('\n'));
                this.queueLogEntry(logEntry);
              } catch (error) {
                // A malformed event must not terminate a long-lived log stream.
                console.error('Failed to parse log stream event:', error);
              }
            }
          }
        })
        .catch(error => {
          if (abortController.signal.aborted) {
            return;
          }

          console.error('Log stream connection error:', error);
          this.ngZone.run(() => {
            this.isConnected = false;
            this.isConnecting = false;
            this.cdr.markForCheck();
          });

          this.reconnectTimer = setTimeout(() => {
            if (!this.isConnected && this.streamAbortController === abortController) {
              this.streamAbortController = undefined;
              this.connectToLogStream();
            }
          }, 5000);
        });
    });
  }

  private disconnectFromLogStream(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.streamAbortController) {
      this.streamAbortController.abort();
      this.streamAbortController = undefined;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  private buildFilterParams(): string {
    const params = new URLSearchParams();

    if (this.filterSeverityNumber && this.filterSeverityNumber.trim()) {
      params.append('severityNumber', this.filterSeverityNumber);
    }

    if (this.filterSeverityText && this.filterSeverityText.trim()) {
      params.append('severityText', this.filterSeverityText);
    }

    if (this.filterLogContent && this.filterLogContent.trim()) {
      params.append('logContent', this.filterLogContent);
    }

    if (this.filterTraceId && this.filterTraceId.trim()) {
      params.append('traceId', this.filterTraceId);
    }

    if (this.filterSpanId && this.filterSpanId.trim()) {
      params.append('spanId', this.filterSpanId);
    }

    return params.toString();
  }

  private queueLogEntry(logEntry: LogEntry): void {
    // Drop logs if buffer is full (backpressure)
    if (this.pendingLogs.length >= this.MAX_PENDING_LOGS) {
      return;
    }

    // Pre-compute everything to minimize work during render
    const extendedEntry: ExtendedLogEntry = {
      original: logEntry,
      timestamp: logEntry.timeUnixNano ? new Date(logEntry.timeUnixNano / 1000000) : new Date(),
      displayText: this.formatLogDisplay(logEntry),
      severityColor: this.computeSeverityColor(logEntry.severityNumber)
    };

    this.pendingLogs.push(extendedEntry);

    // Schedule flush using requestAnimationFrame for smooth rendering
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flushPendingLogs());
    }
  }

  private formatLogDisplay(logEntry: LogEntry): string {
    return JSON.stringify(logEntry);
  }

  private computeSeverityColor(severityNumber: number | undefined): string {
    if (!severityNumber) return 'default';
    if (severityNumber < 5) return 'default'; // 1-4
    if (severityNumber < 9) return 'blue'; // 5-8
    if (severityNumber < 13) return 'green'; // 9-12
    if (severityNumber < 17) return 'orange'; // 13-16
    if (severityNumber < 21) return 'red'; // 17-20
    if (severityNumber < 25) return 'volcano'; // 21-24
    return 'default';
  }

  private flushPendingLogs(): void {
    this.rafId = null;

    const now = performance.now();
    if (now - this.lastFlushTime < this.MIN_FLUSH_INTERVAL) {
      // Too soon, reschedule
      this.rafId = requestAnimationFrame(() => this.flushPendingLogs());
      return;
    }

    if (this.pendingLogs.length === 0) {
      return;
    }

    this.lastFlushTime = now;

    // Get pending logs and clear
    const newEntries = this.pendingLogs;
    this.pendingLogs = [];

    // Reverse in place for performance
    newEntries.reverse();

    // Run inside Angular zone for change detection
    this.ngZone.run(() => {
      // Create new array reference for virtual scroll
      let updated: ExtendedLogEntry[];

      if (this.logEntries.length + newEntries.length <= this.maxLogEntries) {
        updated = [...newEntries, ...this.logEntries];
      } else {
        // Truncate old entries
        const keepCount = Math.max(0, this.maxLogEntries - newEntries.length);
        updated = [...newEntries, ...this.logEntries.slice(0, keepCount)];
      }

      this.logEntries = updated;

      // Auto scroll to top if enabled and user hasn't scrolled away
      if (!this.userScrolled && this.viewport) {
        this.viewport.scrollToIndex(0);
      }

      this.cdr.markForCheck();
    });
  }

  private setupScrollListener(): void {
    if (this.viewport) {
      this.viewport.elementScrolled().subscribe(() => {
        this.handleScroll();
      });
    }
  }

  private cleanupScrollListener(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  private handleScroll(): void {
    if (!this.viewport) return;

    const scrollTop = this.viewport.measureScrollOffset();

    // Check if user is near the top
    this.isNearTop = scrollTop <= 40;

    // If user scrolls away from top, mark as user scrolled
    if (!this.isNearTop) {
      this.userScrolled = true;
    } else {
      // If user scrolls back to top, reset the flag
      this.userScrolled = false;
    }
  }

  private scheduleAutoScroll(): void {
    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Schedule scroll with longer delay to ensure DOM update
    this.scrollTimeout = setTimeout(() => {
      this.performAutoScroll();
    }, 100);
  }

  private performAutoScroll(): void {
    if (!this.viewport || this.userScrolled) {
      return;
    }

    this.viewport.scrollToIndex(0, 'smooth');
  }

  // Event handlers
  onApplyFilters(): void {
    this.resetState();
    this.connectToLogStream();
    this.cdr.markForCheck();
  }

  onClearFilters(): void {
    this.filterSeverityNumber = '';
    this.filterSeverityText = '';
    this.filterLogContent = '';
    this.filterTraceId = '';
    this.filterSpanId = '';
    this.resetState();
    this.connectToLogStream();
    this.cdr.markForCheck();
  }

  onTogglePause(): void {
    this.isPaused = !this.isPaused;
    this.cdr.markForCheck();
  }

  onClearLogs(): void {
    this.resetState();
    this.cdr.markForCheck();
  }

  onToggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.cdr.markForCheck();
  }

  private resetState(): void {
    this.logEntries = [];
    this.pendingLogs = [];
    this.displayedLogCount = 0;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.userScrolled = false;
    this.isNearTop = true;
  }

  // Add method to manually scroll to top
  scrollToTop(): void {
    this.userScrolled = false;
    this.isNearTop = true;
    this.scheduleAutoScroll();
  }

  // Utility methods
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  trackByLogEntry(index: number, logEntry: ExtendedLogEntry): any {
    return logEntry.original.timeUnixNano || index;
  }

  // Modal methods
  showLogDetails(logEntry: ExtendedLogEntry): void {
    this.selectedLogEntry = logEntry;
    this.isModalVisible = true;
    this.cdr.markForCheck();
  }

  handleModalOk(): void {
    this.isModalVisible = false;
    this.selectedLogEntry = null;
    this.cdr.markForCheck();
  }

  handleModalCancel(): void {
    this.isModalVisible = false;
    this.selectedLogEntry = null;
    this.cdr.markForCheck();
  }

  getLogEntryJson(logEntry: LogEntry): string {
    return JSON.stringify(logEntry, null, 2);
  }
}
