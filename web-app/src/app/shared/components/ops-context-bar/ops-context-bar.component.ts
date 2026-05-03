import { CommonModule } from '@angular/common';
import { Component, Inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { OpsWorkspaceFacade } from '../../../core/ops-workspace/ops-workspace.facade';
import { OpsFilterKey } from '../../../core/ops-workspace/ops-workspace.types';

type PresetOption = { key: '15m' | '1h' | '6h' | '24h' | '7d'; label: string };

@Component({
  selector: 'app-ops-context-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzTagModule, NzToolTipModule],
  templateUrl: './ops-context-bar.component.html',
  styleUrl: './ops-context-bar.component.less'
})
export class OpsContextBarComponent {
  readonly presetOptions: PresetOption[] = [
    { key: '15m', label: '15m' },
    { key: '1h', label: '1h' },
    { key: '6h', label: '6h' },
    { key: '24h', label: '24h' },
    { key: '7d', label: '7d' }
  ];
  readonly quickFilters: Array<{ key: OpsFilterKey; label: string; values: string[] }> = [
    { key: 'environment', label: 'ops.context.quick-filter.environment', values: ['prod', 'staging'] },
    { key: 'owner', label: 'ops.context.quick-filter.owner', values: ['platform', 'sre'] },
    { key: 'severity', label: 'ops.context.quick-filter.severity', values: ['critical', 'warning'] },
    { key: 'status', label: 'ops.context.quick-filter.status', values: ['firing', 'degraded'] }
  ];
  readonly activeRangeLabel = computed(() => this.getTimeRangeLabel());
  readonly activeFiltersLabel = computed(() => this.translate('ops.context.active-filters', { count: this.facade.filterChips().length }));
  searchInput = '';

  constructor(
    @Inject(ALAIN_I18N_TOKEN) private readonly i18nSvc: I18NService,
    public readonly facade: OpsWorkspaceFacade
  ) {}

  translate(key: string, params?: Record<string, string | number>): string {
    return this.i18nSvc.fanyi(key, params);
  }

  getTimePresetLabel(preset: PresetOption): string {
    return this.translate('ops.context.range.last', { label: preset.label });
  }

  getAutoRefreshLabel(): string {
    return this.translate(this.facade.autoRefresh() ? 'ops.context.auto-refresh.on' : 'ops.context.auto-refresh.off');
  }

  getQuickFilterLabel(labelKey: string): string {
    return this.translate(labelKey);
  }

  getQuickFilterValueLabel(key: OpsFilterKey, value: string): string {
    const translationKey = this.getFilterValueTranslationKey(key, value);
    return translationKey ? this.translate(translationKey) : value;
  }

  getFilterChipLabel(key: OpsFilterKey): string {
    return this.translate(`ops.context.quick-filter.${key}`);
  }

  getFilterChipValueLabel(key: OpsFilterKey, value: string): string {
    return this.getQuickFilterValueLabel(key, value);
  }

  getChipAriaLabel(value: string): string {
    return `${this.translate('common.delete')} ${value}`;
  }

  private getTimeRangeLabel(): string {
    const range = this.facade.timeRange();
    if (range.presetKey === 'custom') {
      return this.translate('ops.context.range.custom');
    }
    const preset = this.presetOptions.find(option => option.key === range.presetKey);
    return preset ? this.getTimePresetLabel(preset) : range.label;
  }

  setPreset(presetKey: PresetOption['key']): void {
    this.facade.setTimePreset(presetKey);
  }

  toggleAutoRefresh(): void {
    this.facade.setAutoRefresh(!this.facade.autoRefresh());
  }

  addQuickFilter(key: OpsFilterKey, value: string): void {
    this.facade.appendFilter(key, value);
  }

  removeChip(key: OpsFilterKey, value: string): void {
    this.facade.removeFilter(key, value);
  }

  applySearch(): void {
    const search = this.searchInput.trim();
    this.facade.setQueryContext({ search });
    if (search) {
      this.facade.appendFilter('service', search);
    }
    this.searchInput = '';
  }

  clearAllFilters(): void {
    this.facade.clearFilters();
  }

  private getFilterValueTranslationKey(key: OpsFilterKey, value: string): string | null {
    if (key === 'severity') {
      return `dashboard.severity.${value}`;
    }
    if (key === 'status') {
      return value === 'degraded' ? 'entity.status.degraded' : `alert.status.${value}`;
    }
    if (key === 'environment' || key === 'owner') {
      return `ops.context.value.${value}`;
    }
    return null;
  }
}
