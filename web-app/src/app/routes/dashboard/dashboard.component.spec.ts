import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';

import { I18NService } from '../../core/i18n/i18n.service';
import { OpsWorkspaceFacade } from '../../core/ops-workspace/ops-workspace.facade';
import { Message } from '../../pojo/Message';
import { AppCount } from '../../pojo/AppCount';
import { Page } from '../../pojo/Page';
import { SingleAlert } from '../../pojo/SingleAlert';
import { AlertService } from '../../service/alert.service';
import { CollectorService } from '../../service/collector.service';
import { MonitorService } from '../../service/monitor.service';
import { ThemeService } from '../../service/theme.service';
import { EntityService } from '../../service/entity.service';
import { SharedModule } from '../../shared/shared.module';
import { ActivityTimelineComponent } from '../../shared/components/activity-timeline/activity-timeline.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';
import { DashboardComponent } from './dashboard.component';

class MockI18nService {
  fanyi(key: string): string {
    const map: Record<string, string> = {
      'dashboard.darkops.kicker': '总览',
      'dashboard.darkops.title': '运维总览',
      'dashboard.darkops.subtitle': '围绕健康度、责任归属和下一步动作的 problem-first 总览。',
      'dashboard.problem-focus.kicker': '当前优先问题',
      'dashboard.problem-focus.open-context': '打开上下文',
      'dashboard.problem-focus.review-alerts': '查看告警',
      'dashboard.quick-entry.kicker': '快速入口',
      'dashboard.quick-entry.title': '继续调查当前工作区',
      'dashboard.quick-entry.entities': '打开对象目录',
      'dashboard.quick-entry.entities.copy': '先按对象定位问题，再决定往哪条信号链继续深入。',
      'dashboard.quick-entry.logs': '打开日志工作台',
      'dashboard.quick-entry.logs.copy': '保留当前时间范围，继续排查时间片里的日志上下文。',
      'dashboard.quick-entry.traces': '打开链路工作台',
      'dashboard.quick-entry.traces.copy': '从当前问题时间窗继续钻取异常路径和调用关系。',
      'dashboard.quick-entry.metrics': '打开指标工作台',
      'dashboard.quick-entry.metrics.copy': '围绕当前对象和服务上下文继续分析指标趋势。',
      'dashboard.quick-entry.dashboards': '打开仪表盘',
      'dashboard.quick-entry.dashboards.copy': '切回全局概览视角，对比当前对象与整体状态。',
      'dashboard.workbench.kicker': '当前状态',
      'dashboard.workbench.title': '当前范围内的状态摘要',
      'dashboard.workbench.copy': '这里汇总实体、告警和覆盖情况，方便继续查看。',
      'dashboard.workbench.fact.entities': '纳管实体',
      'dashboard.workbench.fact.alerts': '活跃告警',
      'dashboard.workbench.fact.unassigned': '待分派问题',
      'dashboard.workbench.action.entities': '打开实体目录',
      'dashboard.workbench.action.alerts': '查看告警工作台',
      'dashboard.status.kicker': '信号状态',
      'dashboard.status.title': '优先看状态，再决定往哪条链继续钻取。',
      'dashboard.affected.kicker': '受影响实体',
      'dashboard.affected.title': '先打开侧边上下文，再决定是否整页跳转。',
      'dashboard.affected.browse-all': '查看全部',
      'dashboard.activity.title': '最近事件流',
      'dashboard.coverage.kicker': '当前纳管概览',
      'dashboard.coverage.title': '按实体类型快速查看当前工作台覆盖情况。',
      'dashboard.empty.title': '运维总览会在接入后自动形成',
      'dashboard.empty.copy': '完成一条可用信号接入后，这里会开始展示问题、状态和下一步动作。',
      'dashboard.setup.kicker': '构建你的可观测基础',
      'dashboard.setup.title': '当前还没有接入足够的工作台数据',
      'dashboard.setup.subtitle': '先接入日志、链路、指标和实体，再回到首页查看完整运维上下文。',
      'dashboard.setup.progress': '工作台初始化进度',
      'dashboard.setup.progress-value': '第 1 步，共 4 步',
      'dashboard.setup.next-title': '接下来建议先完成这三步',
      'dashboard.setup.cta.logs': '接入日志',
      'dashboard.setup.cta.traces': '接入链路',
      'dashboard.setup.cta.metrics': '查看监控',
      'dashboard.setup.cta.entities': '查看实体目录',
      'dashboard.setup.status.title': '先确认哪些基础信号已经接进来',
      'dashboard.setup.status.logs': '日志',
      'dashboard.setup.status.traces': '链路',
      'dashboard.setup.status.metrics': '指标',
      'dashboard.setup.status.pending': '尚未接入',
      'dashboard.setup.status.ready': '已接入',
      'dashboard.setup.learn.kicker': '继续搭工作台',
      'dashboard.setup.learn.title': '把 setup、视图和告警都串起来',
      'dashboard.setup.learn.logs.title': '先把日志接入跑通',
      'dashboard.setup.learn.logs.copy': '有日志后，首页和 Explorer 才能开始积累上下文。',
      'dashboard.setup.learn.traces.title': '再把链路补进来',
      'dashboard.setup.learn.traces.copy': '链路到位后，首页才能显示服务调用和异常路径。',
      'dashboard.setup.learn.alerts.title': '最后补齐告警闭环',
      'dashboard.setup.learn.alerts.copy': '让告警、负责人和处置入口一起形成闭环。',
      'dashboard.setup.learn.action.docs': '查看接入文档',
      'dashboard.setup.learn.action.entities': '打开实体目录',
      'dashboard.activity.empty': '当前上下文里还没有新的运维信号。',
      'dashboard.darkops.action.refresh': '刷新',
      'dashboard.darkops.action.review-alerts': '查看告警',
      'workspace.guidance.start': '下一步',
      'workspace.guidance.reasons': '原因',
      'workspace.guidance.next': '随后可做',
      'dashboard.guidance.setup.headline': '下一步：先接入一条可用信号链路',
      'dashboard.guidance.setup.description': '先完成一条可用信号链路，首页才会开始展示问题总览。',
      'dashboard.guidance.setup.action': '去完成接入',
      'dashboard.guidance.ready.headline': '下一步：先处理当前最值得关注的问题',
      'dashboard.guidance.ready.description': '从当前问题开始查看相关对象和信号。',
      'dashboard.summary.healthy.label': '健康实体',
      'dashboard.summary.healthy.hint': '健康实体占当前目录的大多数。',
      'dashboard.summary.healthy.delta': '继续保持覆盖',
      'dashboard.summary.degraded.label': '待关注对象',
      'dashboard.summary.degraded.hint': '这些对象还需要继续收口。',
      'dashboard.summary.degraded.delta.active': '{{count}} 个对象需要继续查看',
      'dashboard.summary.degraded.delta.idle': '当前没有待关注对象',
      'dashboard.summary.critical.label': '关键告警',
      'dashboard.summary.critical.hint': '优先处理会直接影响恢复路径的告警。',
      'dashboard.summary.critical.delta.active': '{{count}} 条需要优先处理',
      'dashboard.summary.critical.delta.idle': '当前没有关键告警',
      'dashboard.summary.incidents.label': '问题上下文',
      'dashboard.summary.incidents.hint': '当前首页已经串起了可继续钻取的上下文。',
      'dashboard.summary.incidents.delta': '优先沿上下文继续排查',
      'dashboard.summary.unassigned.label': '待补归属',
      'dashboard.summary.unassigned.hint': '这些问题还没有清晰责任归属。',
      'dashboard.summary.unassigned.delta.active': '{{count}} 条问题待补归属',
      'dashboard.summary.unassigned.delta.idle': '当前没有待补归属问题',
      'dashboard.owner.unassigned': '待分配',
      'dashboard.severity.critical': '关键',
      'dashboard.summary.drawer-subtitle': '摘要详情',
      'dashboard.summary.value': '当前值',
      'dashboard.summary.delta': '说明',
      'dashboard.problem-focus.owner': '负责人',
      'dashboard.problem-focus.entity': '对象',
      'dashboard.home.status.title': '工作区状态',
      'dashboard.home.status.copy': '先确认数据、对象和告警是否已经进入同一调查系统。',
      'dashboard.home.status.workspace': '工作区',
      'dashboard.home.status.ingestion': '遥测接入',
      'dashboard.home.status.entities': '对象上下文',
      'dashboard.home.status.alerts': '告警规则',
      'dashboard.home.status.ready': '已就绪',
      'dashboard.home.status.pending': '待完成',
      'dashboard.home.status.action.ingestion': '接入第一个数据源',
      'dashboard.home.status.action.entities': '打开对象目录',
      'dashboard.setup.checklist.title': '下一步任务轨道',
      'dashboard.setup.checklist.data-source': '接入第一条数据源',
      'dashboard.setup.checklist.entities': '建立第一个对象',
      'dashboard.setup.checklist.logs': '查看日志',
      'dashboard.setup.checklist.traces': '查看链路',
      'dashboard.setup.checklist.metrics': '查看指标',
      'dashboard.setup.checklist.alerts': '建立告警',
      'dashboard.setup.checklist.dashboards': '建立仪表盘'
    };
    return map[key] ?? key;
  }
}

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let facade: OpsWorkspaceFacade;

  async function createComponent(appCounts: AppCount[], alerts: SingleAlert[]): Promise<void> {
    await TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        RouterTestingModule,
        SharedModule,
        PageShellComponent,
        SummaryCardComponent,
        ActivityTimelineComponent
      ],
      declarations: [DashboardComponent],
      providers: [
        OpsWorkspaceFacade,
        NzMessageService,
        { provide: ALAIN_I18N_TOKEN, useClass: MockI18nService },
        { provide: I18NService, useClass: MockI18nService },
        { provide: ThemeService, useValue: { getTheme: () => 'dark-ops' } },
        { provide: CollectorService, useValue: {} },
        {
          provide: MonitorService,
          useValue: {
            getAppsMonitorSummary: () => of({ code: 0, data: appCounts } as Message<AppCount[]>),
            searchMonitors: () => of({ code: 0, data: { content: [], totalElements: 0 } })
          }
        },
        {
          provide: EntityService,
          useValue: {
            searchEntities: () => of({ code: 0, data: { content: [], totalElements: 0 } }),
            getDefinitionActivities: () => of({ code: 0, data: [] }),
            getDiscoveryGovernancePresets: () => of({ code: 0, data: [] })
          }
        },
        {
          provide: AlertService,
          useValue: {
            loadAlerts: () =>
              of({
                code: 0,
                data: {
                  content: alerts,
                  totalElements: alerts.length,
                  totalPages: 1,
                  size: 6,
                  number: 0,
                  numberOfElements: alerts.length
                } as unknown as Page<SingleAlert>
              } as Message<Page<SingleAlert>>)
          }
        }
      ]
    });

    await TestBed.compileComponents();

    facade = TestBed.inject(OpsWorkspaceFacade);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should render a denser overview with one start area and one supporting status panel', async () => {
    const appCounts = [
      Object.assign(new AppCount(), { category: 'service', size: 24, availableSize: 19, unAvailableSize: 3, unManageSize: 2 }),
      Object.assign(new AppCount(), { category: 'db', size: 8, availableSize: 6, unAvailableSize: 1, unManageSize: 1 })
    ];
    const alert = Object.assign(new SingleAlert(), {
      id: 1,
      content: 'checkout-api latency spike',
      status: 'firing',
      labels: { service: 'checkout-api', severity: 'critical' },
      annotations: { summary: 'High latency detected' },
      gmtUpdate: Date.now()
    });

    await createComponent(appCounts, [alert]);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('运维总览');
    expect(root.textContent).toContain('下一步：先处理当前最值得关注的问题');
    expect(root.textContent).toContain('从当前问题开始查看相关对象和信号。');
    expect(root.textContent).toContain('原因');
    expect(root.textContent).toContain('随后可做');
    expect(root.textContent).toContain('当前状态');
    expect(root.textContent).toContain('当前范围内的状态摘要');
    expect(root.textContent).toContain('纳管实体');
    expect(root.textContent).toContain('活跃告警');
    expect(root.textContent).toContain('待分派问题');
    expect(root.textContent).toContain('当前优先问题');
    expect(root.textContent).toContain('优先看状态，再决定往哪条链继续钻取。');
    expect(root.textContent).toContain('受影响实体');
    expect(root.textContent).toContain('最近事件流');
    expect(root.textContent).toContain('按实体类型快速查看当前工作台覆盖情况。');
    expect(root.textContent).toContain('service');
    expect(root.textContent).toContain('checkout-api latency spike');
    expect(root.textContent?.match(/打开日志工作台/g)?.length).toBeGreaterThanOrEqual(1);
    expect(root.textContent).toContain('工作区状态');
    expect(root.textContent).toContain('先确认数据、对象和告警是否已经进入同一调查系统。');
    expect(root.textContent).toContain('继续调查当前工作区');
    expect(root.textContent).toContain('打开对象目录');
    expect(root.textContent).toContain('打开指标工作台');
    expect(root.textContent).toContain('打开仪表盘');
    expect(root.querySelectorAll('.dashboard-quick-entry-button').length).toBe(5);
    expect(root.querySelector('.dashboard-setup-shell')).toBeNull();
    expect(root.querySelector('.dashboard-home-grid.dashboard-home-grid--console')).not.toBeNull();
    expect(root.querySelector('.dashboard-workspace-ready-panel')).not.toBeNull();
    expect(root.querySelector('.dashboard-side-summary-panel')).not.toBeNull();
    expect(root.querySelector('.workspace-guidance-panel')).not.toBeNull();
    expect(root.querySelector('.dashboard-priority-panel.dashboard-panel--compact')).not.toBeNull();
    expect(root.querySelector('.dashboard-priority-panel.dashboard-priority-panel--muted')).not.toBeNull();
    expect(root.querySelector('.dashboard-overview-flow')).not.toBeNull();
    expect(root.querySelector('.dashboard-overview-flow app-activity-timeline')).not.toBeNull();
    expect(root.querySelector('.dashboard-home-side app-activity-timeline')).toBeNull();
    expect(root.querySelector('.dashboard-side-summary-panel .dashboard-quick-entry-list')).toBeNull();
    expect(root.querySelector('.dashboard-coverage-list.dashboard-coverage-list--rows')).not.toBeNull();

    (root.querySelector('.dashboard-impacted-row') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(facade.drawer()?.title).toContain('service');
  });

  it('should show a lightweight empty overview while setup stays in the header entry', async () => {
    await createComponent([], []);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('运维总览会在接入后自动形成');
    expect(root.textContent).toContain('完成一条可用信号接入后，这里会开始展示问题、状态和下一步动作。');
    expect(root.textContent).not.toContain('当前状态');
    expect(root.textContent).not.toContain('推荐入口');
    expect(root.textContent).toContain('下一步：先接入一条可用信号链路');
    expect(root.textContent).toContain('先完成一条可用信号链路，首页才会开始展示问题总览。');
    expect(root.textContent).toContain('原因');
    expect(root.textContent).toContain('工作区状态');
    expect(root.textContent).toContain('下一步任务轨道');
    expect(root.textContent).toContain('接入第一条数据源');
    expect(root.textContent).toContain('建立第一个对象');
    expect(root.textContent).toContain('建立仪表盘');
    expect(root.textContent).not.toContain('随后可做');
    expect(root.textContent).not.toContain('当前还没有接入足够的工作台数据');
    expect(root.textContent).not.toContain('工作台初始化进度');
    expect(root.textContent).not.toContain('第 1 步，共 4 步');
    expect(root.textContent).not.toContain('先确认哪些基础信号已经接进来');
    expect(root.textContent).toContain('日志');
    expect(root.textContent).toContain('链路');
    expect(root.textContent).toContain('指标');
    expect(root.textContent).toContain('尚未接入');
    expect(root.textContent).toContain('去完成接入');
    expect(root.textContent).toContain('当前上下文里还没有新的运维信号。');
    expect(root.textContent).not.toContain('查看告警');
    expect(root.querySelector('.dashboard-home-grid.dashboard-home-grid--console')).not.toBeNull();
    expect(root.querySelector('.workspace-guidance-panel')).not.toBeNull();
    expect(root.querySelector('.dashboard-empty-panel')).not.toBeNull();
    expect(root.querySelector('.dashboard-empty-panel app-platform-drawer-callout-card')).not.toBeNull();
    expect(root.querySelector('.dashboard-empty-note')).toBeNull();
    expect(root.querySelector('.dashboard-overview-flow')).not.toBeNull();
    expect(root.querySelector('.dashboard-overview-flow app-activity-timeline')).not.toBeNull();
    expect(root.querySelector('.dashboard-home-side app-activity-timeline')).toBeNull();
    expect(root.querySelector('.dashboard-setup-shell')).toBeNull();
    expect(root.querySelector('.dashboard-priority-panel')).toBeNull();
    expect(root.querySelectorAll('app-page-shell button').length).toBeLessThan(3);
  });

  it('should keep the ready overview shell after refresh even if the latest payload is temporarily empty', async () => {
    const appCounts = [Object.assign(new AppCount(), { category: 'service', size: 12, availableSize: 11, unAvailableSize: 1, unManageSize: 0 })];
    const alerts = [
      Object.assign(new SingleAlert(), {
        id: 2,
        content: 'payment-api error burst',
        status: 'firing',
        labels: { service: 'payment-api', severity: 'critical' },
        annotations: { summary: 'High error rate detected' },
        gmtUpdate: Date.now()
      })
    ];

    await createComponent(appCounts, alerts);

    appCounts.splice(0, appCounts.length);
    alerts.splice(0, alerts.length);
    component.onPageAction('refresh');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.dashboard-setup-shell')).toBeNull();
    expect(root.querySelector('.dashboard-priority-panel')).not.toBeNull();
    expect(root.textContent).toContain('下一步：先处理当前最值得关注的问题');
  });
});
