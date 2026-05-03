import { CommonModule } from '@angular/common';
import { Component, Input, NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { of } from 'rxjs';

import { Message } from '../../../pojo/Message';
import { Page } from '../../../pojo/Page';
import { AlertInhibitService } from '../../../service/alert-inhibit.service';
import { AlertService } from '../../../service/alert.service';
import { AlertSilenceService } from '../../../service/alert-silence.service';
import { EntityService } from '../../../service/entity.service';
import { AlertCenterComponent } from './alert-center.component';

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    const map: Record<string, string> = {
      'alert.help.center': '告警工作台帮助',
      'alert.help.center.link': '查看帮助',
      'menu.alert.center': '告警中心',
      'alert.center.search': '搜索告警',
      'alert.center.filter-status': '按状态筛选',
      'entity.response.context.severity': '严重级别',
      'alert.workbench.kicker': '告警工作台',
      'alert.workbench.title': '集中查看并处理当前告警',
      'alert.workbench.copy': '按时间、状态和对象筛选告警，并在这里完成确认、恢复或继续查看详情。',
      'alert.workbench.total': '全部告警组',
      'alert.workbench.firing': '告警中',
      'alert.workbench.acknowledged': '已确认',
      'alert.workbench.resolved': '已恢复',
      'alert.workbench.action.refresh': '刷新',
      'alert.workbench.action.clear-filters': '清空筛选',
      'alert.workbench.empty.title': '当前范围内没有告警',
      'alert.workbench.empty.copy': '当前时间范围和筛选条件下还没有可处理的告警，点击刷新后重新查询最新结果。',
      'alert.workbench.empty.copy.filtered': '当前筛选条件下没有匹配结果，可以调整筛选条件或重新查询最新结果。',
      'alert.status.firing': '告警中',
      'alert.status.acknowledged': '已确认',
      'alert.status.resolved': '已恢复'
    };
    return map[value] ?? value;
  }
}

class MockI18nService {
  fanyi(key: string): string {
    const map: Record<string, string> = {
      'common.week.7': '周日',
      'common.week.1': '周一',
      'common.week.2': '周二',
      'common.week.3': '周三',
      'common.week.4': '周四',
      'common.week.5': '周五',
      'common.week.6': '周六',
      'alert.status.firing': '告警中',
      'alert.status.acknowledged': '已确认',
      'alert.status.resolved': '已恢复',
      'alert.workbench.total': '全部告警组',
      'alert.workbench.firing': '告警中',
      'alert.workbench.acknowledged': '已确认',
      'alert.workbench.resolved': '已恢复',
      'alert.workbench.copy': '按时间、状态和对象筛选告警，并在这里完成确认、恢复或继续查看详情。',
      'alert.workbench.copy.entity': '当前已经带着实体上下文进入告警工作台，先在这里完成筛选和处理，再决定是否回到实体详情。',
      'entity.status.degraded': '降级',
      'common.delete': '删除'
    };
    return map[key] ?? key;
  }
}

@Component({
  selector: 'app-platform-facts-strip',
  template: `
    <div class="mock-platform-facts-strip">
      <span *ngFor="let item of items">{{ item.label }} {{ item.value }}</span>
    </div>
  `,
  standalone: false
})
class MockPlatformFactsStripComponent {
  @Input() items: Array<{ label: string; value: string }> = [];
}

describe('AlertCenterComponent', () => {
  let fixture: ComponentFixture<AlertCenterComponent>;

  beforeEach(async () => {
    class MockEventSource {
      onerror: ((error: Event) => void) | null = null;
      addEventListener(): void {}
      close(): void {}
    }

    (window as unknown as { EventSource: typeof EventSource }).EventSource = MockEventSource as unknown as typeof EventSource;

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule],
      declarations: [AlertCenterComponent, MockI18nPipe, MockPlatformFactsStripComponent],
      providers: [
        { provide: ALAIN_I18N_TOKEN, useClass: MockI18nService },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        {
          provide: AlertService,
          useValue: {
            loadGroupAlerts: () =>
              of({
                code: 0,
                data: {
                  content: [
                    {
                      id: 1,
                      status: 'firing',
                      gmtUpdate: Date.now(),
                      groupLabels: { service: 'checkout-api', severity: 'critical' },
                      alerts: [
                        {
                          id: 11,
                          status: 'firing',
                          content: 'checkout-api latency spike',
                          startAt: Date.now(),
                          activeAt: Date.now(),
                          labels: { alertname: 'HighLatency', service: 'checkout-api', severity: 'critical' },
                          annotations: { summary: 'Latency above threshold' }
                        }
                      ]
                    }
                  ],
                  totalElements: 1,
                  totalPages: 1,
                  size: 8,
                  number: 0,
                  numberOfElements: 1
                } as unknown as Page<unknown>
              } as Message<Page<unknown>>),
            deleteGroupAlerts: () => of({ code: 0 } as Message<null>),
            applyGroupAlertsStatus: () => of({ code: 0 } as Message<null>)
          }
        },
        { provide: AlertInhibitService, useValue: { newAlertInhibit: () => of({ code: 0 }) } },
        { provide: AlertSilenceService, useValue: { newAlertSilence: () => of({ code: 0 }) } },
        { provide: EntityService, useValue: { getEntityDetail: () => of({ code: 0, data: null }) } },
        { provide: NzNotificationService, useValue: { success() {}, error() {}, warning() {} } },
        { provide: NzModalService, useValue: { confirm() {} } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertCenterComponent);
    fixture.detectChanges();
  });

  it('should render a dense console toolbar and compact alert cards', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.alert-workbench-shell')).not.toBeNull();
    expect(root.querySelector('app-page-shell')).not.toBeNull();
    expect(root.querySelector('app-platform-facts-strip')).not.toBeNull();
    expect(root.querySelector('.alert-console-header')).toBeNull();
    expect(root.querySelector('.alert-toolbar-shell.alert-toolbar-shell--dense')).not.toBeNull();
    expect(root.querySelector('.alert-cards.alert-cards--dense')).not.toBeNull();
    expect(root.querySelector('.alert-card.alert-card--console')).not.toBeNull();
    expect(root.textContent).toContain('全部告警组');
    expect(root.textContent).toContain('告警中');
    expect(root.querySelector('.alert-console-actions')).toBeNull();
    expect(root.textContent).toContain('service:checkout-api');
  });

  it('should let the route host and first shell stretch across the available width', () => {
    const host = fixture.nativeElement as HTMLElement;
    const shell = host.querySelector('.alert-workbench-shell') as HTMLElement;

    const hostStyle = getComputedStyle(host);
    const shellStyle = getComputedStyle(shell);

    expect(hostStyle.display).toBe('flex');
    expect(hostStyle.flexGrow).toBe('1');
    expect(shellStyle.flexGrow).toBe('1');
    expect(shellStyle.minWidth).toBe('0px');
  });

  it('should render a visible empty state instead of leaving the result area blank', () => {
    const component = fixture.componentInstance;
    component.groupAlerts = [];
    component.total = 0;
    component.tableLoading = false;
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const emptyState = root.querySelector('.alert-empty-state') as HTMLElement;

    expect(emptyState).not.toBeNull();
    expect(emptyState.textContent).toContain('当前范围内没有告警');
    expect(emptyState.textContent).toContain('点击刷新后重新查询最新结果');
  });
});
