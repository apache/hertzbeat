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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '@delon/theme';
import { SharedModule } from '@shared';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';

import {
  createSignalTimePreset,
  detectSignalTimePreset,
  SIGNAL_TIME_PRESETS,
  shiftSignalTimeRange,
  SignalTimePreset
} from './signal-query-context';

@Component({
  selector: 'app-signal-time-range',
  standalone: true,
  imports: [FormsModule, I18nPipe, SharedModule, NzDatePickerModule, NzSelectModule],
  template: `
    <div class="range-actions" role="toolbar" [attr.aria-label]="'observability.time.toolbar' | i18n">
      <button nz-button type="button" (click)="shift(-1)" [title]="'observability.time.previous' | i18n">
        <span nz-icon nzType="left"></span>
      </button>
      <nz-select [ngModel]="selectedPreset" (ngModelChange)="selectPreset($event)" [attr.aria-label]="'observability.time.preset' | i18n">
        <nz-option
          *ngFor="let preset of presets"
          [nzValue]="preset.value"
          [nzLabel]="'observability.time.last-' + preset.value | i18n"
        ></nz-option>
        <nz-option *ngIf="selectedPreset === 'custom'" nzValue="custom" [nzLabel]="'observability.time.custom' | i18n"></nz-option>
      </nz-select>
      <button nz-button type="button" [disabled]="!canMoveForward" (click)="shift(1)" [title]="'observability.time.next' | i18n">
        <span nz-icon nzType="right"></span>
      </button>
    </div>
    <nz-range-picker [ngModel]="value" (ngModelChange)="setAbsoluteRange($event)" nzShowTime></nz-range-picker>
    <nz-select
      [ngModel]="refreshSeconds"
      (ngModelChange)="setRefreshInterval($event)"
      [attr.aria-label]="'observability.time.auto-refresh' | i18n"
    >
      <nz-option [nzValue]="0" [nzLabel]="'observability.time.refresh-manual' | i18n"></nz-option>
      <nz-option [nzValue]="10" [nzLabel]="'observability.time.refresh-10s' | i18n"></nz-option>
      <nz-option [nzValue]="30" [nzLabel]="'observability.time.refresh-30s' | i18n"></nz-option>
      <nz-option [nzValue]="60" [nzLabel]="'observability.time.refresh-1m' | i18n"></nz-option>
      <nz-option [nzValue]="300" [nzLabel]="'observability.time.refresh-5m' | i18n"></nz-option>
    </nz-select>
    <button nz-button type="button" (click)="refreshNow()" [title]="'common.refresh' | i18n">
      <span nz-icon nzType="reload"></span>
    </button>
  `,
  styles: [
    `
      :host {
        display: grid;
        grid-template-columns: auto minmax(330px, 1fr) 126px 40px;
        gap: 8px;
        align-items: center;
        min-width: 0;
      }
      .range-actions {
        display: flex;
        min-width: 0;
      }
      .range-actions button {
        flex: 0 0 34px;
      }
      .range-actions button + nz-select,
      .range-actions nz-select + button {
        margin-left: -1px;
      }
      .range-actions nz-select {
        width: 138px;
      }
      nz-range-picker {
        width: 100%;
        min-width: 0;
      }
      :host > button {
        width: 40px;
      }
      @media (max-width: 900px) {
        :host {
          grid-template-columns: auto minmax(260px, 1fr) 112px 40px;
        }
      }
    `
  ]
})
export class SignalTimeRangeComponent implements OnChanges, OnDestroy {
  readonly presets = SIGNAL_TIME_PRESETS;
  @Input() value: Date[] = [];
  @Input() refreshSeconds = 0;
  @Output() readonly valueChange = new EventEmitter<Date[]>();
  @Output() readonly refreshSecondsChange = new EventEmitter<number>();
  @Output() readonly apply = new EventEmitter<void>();
  @Output() readonly refresh = new EventEmitter<void>();
  private timerId?: number;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshSeconds']) this.scheduleRefresh(this.refreshSeconds);
  }

  ngOnDestroy(): void {
    this.clearRefreshTimer();
  }

  get selectedPreset(): SignalTimePreset | 'custom' {
    return detectSignalTimePreset(this.value);
  }

  get canMoveForward(): boolean {
    return Boolean(this.value[1] && this.value[1].getTime() < Date.now() - 30_000);
  }

  selectPreset(preset: SignalTimePreset | 'custom'): void {
    if (preset === 'custom') return;
    this.commit(createSignalTimePreset(preset));
  }

  setAbsoluteRange(value: Date[]): void {
    if (!value?.[0] || !value?.[1]) return;
    this.commit(value);
  }

  shift(direction: -1 | 1): void {
    this.commit(shiftSignalTimeRange(this.value, direction));
  }

  refreshNow(): void {
    this.refresh.emit();
  }

  setRefreshInterval(seconds: number): void {
    this.refreshSecondsChange.emit(seconds);
    this.scheduleRefresh(seconds);
  }

  private commit(value: Date[]): void {
    this.valueChange.emit(value);
    this.apply.emit();
  }

  private scheduleRefresh(seconds: number): void {
    this.clearRefreshTimer();
    if (seconds > 0) this.timerId = window.setInterval(() => this.refresh.emit(), seconds * 1_000);
  }

  private clearRefreshTimer(): void {
    if (this.timerId != null) window.clearInterval(this.timerId);
    this.timerId = undefined;
  }
}
