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

import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { SharedModule } from '@shared';
import { NzAlertModule } from 'ng-zorro-antd/alert';
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

interface ExtendedLogEntry {
  original: LogEntry;
  isNew?: boolean;
  timestamp?: Date;
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
    NzSelectModule,
    NzButtonModule,
    NzTagModule,
    NzToolTipModule,
    NzSwitchModule,
    NzAlertModule,
    NzEmptyModule,
    NzModalModule,
    NzDividerComponent
  ],
  templateUrl: './log-stream.component.html',
  styleUrl: './log-stream.component.less'
})
export class LogStreamComponent implements OnInit, OnDestroy, AfterViewInit {
  // SSE connection and state
  private eventSource!: EventSource;
  isConnected: boolean = false;
  isConnecting: boolean = false;

  // Log data
  logEntries: ExtendedLogEntry[] = [];
  maxLogEntries: number = 1000;
  isPaused: boolean = false;

  // Filter properties
  filterSeverityNumber: string = '';
  filterSeverityText: string = '';
  filterTraceId: string = '';
  filterSpanId: string = '';

  // UI state
  showFilters: boolean = true;

  // Modal state
  isModalVisible: boolean = false;
  selectedLogEntry: ExtendedLogEntry | null = null;

  // Auto scroll state
  userScrolled: boolean = false;
  private scrollTimeout: any;
  private scrollDebounceTimeout: any;
  private isNearBottom: boolean = true;

  // ViewChild for log container
  @ViewChild('logContainer', { static: false }) logContainerRef!: ElementRef;

  constructor(@Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

  ngOnInit(): void {
    this.connectToLogStream();
  }

  ngAfterViewInit(): void {
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    this.disconnectFromLogStream();
    this.cleanupScrollListener();
  }

  onReconnect(): void {
    this.logEntries = [];
    this.connectToLogStream();
  }

  private connectToLogStream(): void {
    if (this.eventSource) {
      this.disconnectFromLogStream();
    }

    this.isConnecting = true;

    // Build filter parameters
    const filterParams = this.buildFilterParams();
    const url = `/api/log/sse/subscribe${filterParams ? `?${filterParams}` : ''}`;

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
      };

      this.eventSource.addEventListener('LOG_EVENT', (evt: MessageEvent) => {
        if (!this.isPaused) {
          try {
            const logEntry: LogEntry = JSON.parse(evt.data);
            this.addLogEntry(logEntry);
          } catch (error) {
            console.error('Error parsing log data:', error);
          }
        }
      });

      this.eventSource.onerror = error => {
        console.error('Log stream connection error:', error);
        this.isConnected = false;
        this.isConnecting = false;

        // Auto-reconnect after 5 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            this.connectToLogStream();
          }
        }, 5000);
      };
    } catch (error) {
      this.isConnecting = false;
      console.error('Failed to create EventSource:', error);
    }
  }

  private disconnectFromLogStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.isConnected = false;
      this.isConnecting = false;
    }
  }

  private buildFilterParams(): string {
    const params = new URLSearchParams();

    if (this.filterSeverityNumber && this.filterSeverityNumber.trim()) {
      params.append('severityNumber', this.filterSeverityNumber);
    }

    if (this.filterSeverityText && this.filterSeverityText.trim()) {
      params.append('severityText', this.filterSeverityText);
    }

    if (this.filterTraceId && this.filterTraceId.trim()) {
      params.append('traceId', this.filterTraceId);
    }

    if (this.filterSpanId && this.filterSpanId.trim()) {
      params.append('spanId', this.filterSpanId);
    }

    return params.toString();
  }

  private addLogEntry(logEntry: LogEntry): void {
    const extendedEntry: ExtendedLogEntry = {
      original: logEntry,
      isNew: true,
      timestamp: logEntry.timeUnixNano ? new Date(logEntry.timeUnixNano / 1000000) : new Date()
    };

    this.logEntries.unshift(extendedEntry);

    // Limit the number of log entries
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(0, this.maxLogEntries);
    }

    // Remove new indicator after animation
    setTimeout(() => {
      const index = this.logEntries.findIndex(entry => entry === extendedEntry);
      if (index !== -1) {
        this.logEntries[index].isNew = false;
      }
    }, 1000);

    // Auto scroll to top if enabled and user hasn't scrolled away
    if (!this.userScrolled) {
      this.scheduleAutoScroll();
    }
  }

  private setupScrollListener(): void {
    if (this.logContainerRef?.nativeElement) {
      const container = this.logContainerRef.nativeElement;

      container.addEventListener('scroll', () => {
        // Debounce scroll events for better performance
        if (this.scrollDebounceTimeout) {
          clearTimeout(this.scrollDebounceTimeout);
        }

        this.scrollDebounceTimeout = setTimeout(() => {
          this.handleScroll();
        }, 100);
      });
    }
  }

  private cleanupScrollListener(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.scrollDebounceTimeout) {
      clearTimeout(this.scrollDebounceTimeout);
    }
  }

  private handleScroll(): void {
    if (!this.logContainerRef?.nativeElement) return;

    const container = this.logContainerRef.nativeElement;
    const scrollTop = container.scrollTop;

    // Check if user is near the top (within 20px for more precise detection)
    this.isNearBottom = scrollTop <= 20;

    // If user scrolls away from top, mark as user scrolled
    if (!this.isNearBottom) {
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
    if (!this.logContainerRef?.nativeElement || this.userScrolled) {
      return;
    }

    const container = this.logContainerRef.nativeElement;

    // Use smooth scroll for better UX
    container.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // Event handlers
  onApplyFilters(): void {
    this.logEntries = []; // Clear existing logs
    this.connectToLogStream(); // Reconnect with new filters
  }

  onClearFilters(): void {
    this.filterSeverityNumber = '';
    this.filterSeverityText = '';
    this.filterTraceId = '';
    this.filterSpanId = '';
    this.logEntries = [];
    this.connectToLogStream();
  }

  onTogglePause(): void {
    this.isPaused = !this.isPaused;
  }

  onClearLogs(): void {
    this.logEntries = [];
    this.userScrolled = false;
    this.isNearBottom = true;
  }

  onToggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // Add method to manually scroll to top
  scrollToTop(): void {
    this.userScrolled = false;
    this.isNearBottom = true;
    this.scheduleAutoScroll();
  }

  // Utility methods
  getSeverityColor(severityNumber: number | undefined): string {
    if (!severityNumber) {
      return 'default';
    }

    // Based on OpenTelemetry specification:
    // 1-4: TRACE, 5-8: DEBUG, 9-12: INFO, 13-16: WARN, 17-20: ERROR, 21-24: FATAL
    if (severityNumber >= 1 && severityNumber <= 4) {
      return 'default'; // TRACE
    } else if (severityNumber >= 5 && severityNumber <= 8) {
      return 'blue'; // DEBUG
    } else if (severityNumber >= 9 && severityNumber <= 12) {
      return 'green'; // INFO
    } else if (severityNumber >= 13 && severityNumber <= 16) {
      return 'orange'; // WARN
    } else if (severityNumber >= 17 && severityNumber <= 20) {
      return 'red'; // ERROR
    } else if (severityNumber >= 21 && severityNumber <= 24) {
      return 'volcano'; // FATAL
    } else {
      return 'default'; // Unknown
    }
  }

  formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleString();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log('Copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  }

  trackByLogEntry(index: number, logEntry: ExtendedLogEntry): any {
    return logEntry.original.timeUnixNano || index;
  }

  // Modal methods
  showLogDetails(logEntry: ExtendedLogEntry): void {
    this.selectedLogEntry = logEntry;
    this.isModalVisible = true;
  }

  handleModalOk(): void {
    this.isModalVisible = false;
    this.selectedLogEntry = null;
  }

  handleModalCancel(): void {
    this.isModalVisible = false;
    this.selectedLogEntry = null;
  }

  getLogEntryJson(logEntry: LogEntry): string {
    return JSON.stringify(logEntry, null, 2);
  }
}
