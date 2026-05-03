import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

import { OpsWorkspaceFacade } from '../../../core/ops-workspace/ops-workspace.facade';
import { OpsContextBarComponent } from './ops-context-bar.component';

class MockI18nService {
  fanyi(key: string, params?: Record<string, string | number>): string {
    const map: Record<string, string> = {
      'ops.context.kicker': '全局上下文',
      'ops.context.title': '所有分析都围绕同一条运维时间线。',
      'ops.context.active-filters': '{{count}} 个生效过滤条件',
      'ops.context.range.last': '最近 {{label}}',
      'ops.context.range.custom': '自定义时间范围',
      'ops.context.auto-refresh.on': '自动刷新已开启',
      'ops.context.auto-refresh.off': '自动刷新已关闭',
      'ops.context.search.placeholder': '搜索实体、负责人、Runbook',
      'ops.context.clear-all': '清空全部',
      'ops.context.quick-filter.environment': '环境',
      'ops.context.quick-filter.owner': '负责人',
      'ops.context.quick-filter.severity': '严重级别',
      'ops.context.quick-filter.status': '状态',
      'ops.context.value.prod': '生产',
      'ops.context.value.staging': '预发',
      'ops.context.value.platform': '平台',
      'ops.context.value.sre': 'SRE',
      'dashboard.severity.critical': '严重',
      'dashboard.severity.warning': '警告',
      'alert.status.firing': '告警中',
      'entity.status.degraded': '降级'
    };
    const template = map[key] ?? key;
    return template.replace(/\{\{(\w+)}}/g, (_match, token) => String(params?.[token] ?? ''));
  }
}

describe('OpsContextBarComponent', () => {
  let fixture: ComponentFixture<OpsContextBarComponent>;
  let facade: OpsWorkspaceFacade;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpsContextBarComponent],
      providers: [OpsWorkspaceFacade, { provide: ALAIN_I18N_TOKEN, useClass: MockI18nService }]
    }).compileComponents();

    facade = TestBed.inject(OpsWorkspaceFacade);
    facade.patchFilters({
      environment: ['prod'],
      severity: ['critical']
    });

    fixture = TestBed.createComponent(OpsContextBarComponent);
    fixture.detectChanges();
  });

  it('should render filter chips and update the global time preset when a range button is clicked', () => {
    const root = fixture.nativeElement as HTMLElement;
    const rangeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.ops-context-range-option'));
    const last24hButton = rangeButtons.find(button => button.textContent?.includes('24h'));

    expect(root.querySelectorAll('.ops-context-chip').length).toBe(2);

    last24hButton?.click();
    fixture.detectChanges();

    expect(facade.timeRange().presetKey).toBe('24h');
  });

  it('should remove a filter chip from the shared facade', () => {
    const root = fixture.nativeElement as HTMLElement;
    const removeButton = root.querySelector('.ops-context-chip-remove') as HTMLButtonElement;

    removeButton.click();
    fixture.detectChanges();

    expect(facade.filterChips().length).toBe(1);
  });

  it('should render localized context copy instead of hard-coded english text', () => {
    const root = fixture.nativeElement as HTMLElement;
    const search = root.querySelector('.ops-context-search input') as HTMLInputElement;
    const clearButton = root.querySelector('.ops-context-chip-clear') as HTMLButtonElement;
    const chipValues = Array.from(root.querySelectorAll('.ops-context-chip-value')).map(node => node.textContent?.trim());
    const quickFilterText = root.textContent ?? '';

    expect(root.querySelector('.ops-context-bar')?.classList.contains('is-toolbar')).toBeTrue();
    expect(root.querySelector('.ops-context-bar')?.classList.contains('is-console-toolbar')).toBeTrue();
    expect(root.querySelector('.ops-context-bar')?.classList.contains('ops-context-bar--console')).toBeTrue();
    expect(root.querySelector('.ops-context-toolbar-main')).not.toBeNull();
    expect(root.querySelector('.ops-context-toolbar-strip')).not.toBeNull();
    expect(root.querySelector('.ops-context-toolbar-strip')?.classList.contains('ops-context-toolbar-strip--compact')).toBeTrue();
    expect(root.querySelector('.ops-context-toolbar-tools')).not.toBeNull();
    expect(root.querySelector('.ops-context-kicker')?.textContent).toContain('全局上下文');
    expect(root.querySelector('.ops-context-title')?.textContent).toContain('所有分析都围绕同一条运维时间线。');
    expect(root.querySelector('.ops-context-subtitle')?.textContent).toContain('2 个生效过滤条件');
    expect(search.placeholder).toBe('搜索实体、负责人、Runbook');
    expect(clearButton.textContent).toContain('清空全部');
    expect(chipValues).toContain('生产');
    expect(chipValues).toContain('严重');
    expect(quickFilterText).toContain('告警中');
  });

  it('should render a localized custom range label instead of Custom Range', () => {
    facade.setCustomTimeRange(Date.UTC(2026, 2, 25, 8, 0, 0), Date.UTC(2026, 2, 25, 9, 0, 0));
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.ops-context-subtitle')?.textContent).toContain('自定义时间范围');
    expect(root.textContent).not.toContain('Custom Range');
  });
});
