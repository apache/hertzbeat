import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ViewEncapsulation, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { I18NService } from '@core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Message } from '../../../pojo/Message';
import { Page } from '../../../pojo/Page';
import { EntitySummary } from '../../../pojo/EntitySummary';
import { EntityService } from '../../../service/entity.service';
import { MonitorService } from '../../../service/monitor.service';
import { filter, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type SetupAction = 'monitors' | 'collector' | 'otlp' | 'entities' | 'discovery' | 'definition' | 'governance';

interface SetupChecklistItem {
  key: string;
  icon: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  action: SetupAction;
}

interface SetupEntryOption {
  key: string;
  title: string;
  description: string;
  action: SetupAction;
}

@Component({
  standalone: false,  selector: 'header-setup-guide',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./setup-guide.component.less'],
  template: `
    <div
      class="header-setup-shell"
      nz-dropdown
      [nzDropdownMenu]="setupMenu"
      nzTrigger="click"
      nzPlacement="bottomLeft"
      nzOverlayClassName="header-setup-dropdown-overlay"
    >
      <button type="button" class="header-setup-trigger">
        <span class="header-setup-trigger-label">{{ t('layout.setup.title', '开始使用') }}</span>
        <i nz-icon nzType="down"></i>
      </button>

      <div class="header-setup-progress">
        <span class="header-setup-progress-copy">{{ progressHeadline }}</span>
        <span class="header-setup-progress-bar">
          <span class="header-setup-progress-fill" [style.width.%]="progressPercent"></span>
        </span>
      </div>
    </div>

    <nz-dropdown-menu #setupMenu="nzDropdownMenu">
      <div nz-menu class="header-setup-menu" (click)="$event.stopPropagation()">
        <div class="header-setup-menu-header">
          <div>
            <div class="header-setup-menu-title">{{ t('layout.setup.menu.title', '开始搭建你的运维目录') }}</div>
            <div class="header-setup-menu-subtitle">
              {{
                t('layout.setup.menu.subtitle', '先建立实体目录，再接入或归并证据，最后把定义和治理收口。')
              }}
            </div>
          </div>
          <button type="button" class="header-setup-refresh" (click)="loadChecklist(true)">
            <i nz-icon nzType="sync" [nzSpin]="loading"></i>
          </button>
        </div>

        <div class="header-setup-menu-progress">
          <div class="header-setup-menu-progress-copy">
            <span>{{ progressSummary }}</span>
          </div>
          <div class="header-setup-menu-progress-percent">{{ progressPercent }}%</div>
        </div>

        <div class="header-setup-menu-track">
          <span class="header-setup-menu-track-fill" [style.width.%]="progressPercent"></span>
        </div>

        <div class="header-setup-next-card">
          <div class="header-setup-next-kicker">{{ t('layout.setup.next.kicker', '推荐下一步') }}</div>
          <div class="header-setup-next-title">{{ nextStepTitle }}</div>
          <div class="header-setup-next-copy">{{ nextStepCopy }}</div>
          <button type="button" class="header-setup-next-action" (click)="openRecommendedStep()">
            {{ nextStepActionLabel }}
          </button>
        </div>

        <div class="header-setup-entry-options" *ngIf="showEntryOptions">
          <div class="header-setup-entry-header">
            <div class="header-setup-entry-title">{{ t('layout.setup.entry.title', '先选择一个起点') }}</div>
            <div class="header-setup-entry-copy">
              {{
                t(
                  'layout.setup.entry.copy',
                  '如果你已经知道对象，先建立实体；如果还没有，再选择主程序、采集器或 OTLP 作为证据入口。'
                )
              }}
            </div>
          </div>

          <button
            type="button"
            class="header-setup-entry-card"
            *ngFor="let option of entryOptions; trackBy: trackByEntryKey"
            (click)="openAction(option.action)"
          >
            <span class="header-setup-entry-card-title">{{ option.title }}</span>
            <span class="header-setup-entry-card-copy">{{ option.description }}</span>
          </button>
        </div>

        <button
          type="button"
          class="header-setup-step"
          *ngFor="let item of checklist; trackBy: trackByKey"
          [class.is-complete]="item.completed"
          (click)="openStep(item)"
        >
          <span class="header-setup-step-icon">
            <i nz-icon [nzType]="item.completed ? 'check-circle' : item.icon"></i>
          </span>
          <span class="header-setup-step-main">
            <span class="header-setup-step-title">{{ item.title }}</span>
            <span class="header-setup-step-copy">{{ item.description }}</span>
          </span>
          <span class="header-setup-step-status-badge" [class.is-complete]="item.completed">
            <i nz-icon [nzType]="item.completed ? 'check' : 'right'"></i>
          </span>
        </button>

        <div class="header-setup-menu-footer">
          <div class="header-setup-footer-copy">
            <div class="header-setup-footer-title">{{ t('layout.setup.footer.title', '还不确定从哪开始？') }}</div>
            <div class="header-setup-footer-subtitle">
              {{ t('layout.setup.footer.copy', '先走推荐下一步；如果你已经有定义或遥测数据，也可以直接跳到对应入口。') }}
            </div>
          </div>
          <button type="button" class="header-setup-footer-action" (click)="openRecommendedStep()">
            {{ t('layout.setup.footer.action', '打开快速入口') }}
          </button>
        </div>
      </div>
    </nz-dropdown-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderSetupGuideComponent implements OnInit {
  loading = false;
  progressPercent = 0;
  completedCount = 0;
  totalCount = 0;
  checklist: SetupChecklistItem[] = [];
  progressHeadline = '';
  progressSummary = '';
  nextStepTitle = '';
  nextStepCopy = '';
  nextStepActionLabel = '';
  entryOptions: SetupEntryOption[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private lastLoadedAt = 0;
  private readonly minReloadWindowMs = 4000;

  constructor(
    private readonly monitorSvc: MonitorService,
    private readonly entitySvc: EntityService,
    private readonly router: Router,
    private readonly i18n: I18NService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadChecklist(true);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.loadChecklist();
      });
  }

  trackByKey(_: number, item: SetupChecklistItem): string {
    return item.key;
  }

  trackByEntryKey(_: number, item: SetupEntryOption): string {
    return item.key;
  }

  get showEntryOptions(): boolean {
    return true;
  }

  openStep(item: SetupChecklistItem): void {
    this.openAction(item.action);
  }

  openAction(action: SetupAction): void {
    switch (action) {
      case 'monitors':
        this.router.navigateByUrl('/monitors');
        break;
      case 'collector':
        this.router.navigateByUrl('/setting/collector');
        break;
      case 'otlp':
        this.router.navigate(['/ingestion/otlp'], { queryParams: { signal: 'logs' } });
        break;
      case 'entities':
        this.router.navigate(['/entities', 'new']);
        break;
      case 'discovery':
        this.router.navigateByUrl('/entities/discovery');
        break;
      case 'definition':
        this.router.navigate(['/entities/import'], { queryParams: { format: 'yaml' } });
        break;
      case 'governance':
        this.router.navigateByUrl('/entities');
        break;
      default:
        break;
    }
  }

  openRecommendedStep(): void {
    const nextItem = this.getNextChecklistItem();
    if (nextItem != null) {
      this.openStep(nextItem);
      return;
    }
    this.router.navigateByUrl('/entities');
  }

  t(key: string, fallback: string): string {
    const translated = this.i18n.fanyi(key);
    return translated && translated !== key ? translated : fallback;
  }

  loadChecklist(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastLoadedAt < this.minReloadWindowMs) {
      return;
    }
    this.lastLoadedAt = now;
    this.loading = true;
    this.cdr.markForCheck();

    forkJoin({
      monitors: this.monitorSvc.searchMonitors(undefined, undefined, '', 9, 0, 1).pipe(catchError(() => of(this.emptyPageMessage<any>()))),
      entities: this.entitySvc
        .searchEntities(undefined, undefined, undefined, undefined, undefined, 0, 200)
        .pipe(catchError(() => of(this.emptyPageMessage<EntitySummary>()))),
      definitionActivities: this.entitySvc.getDefinitionActivities(undefined, 8).pipe(catchError(() => of(this.emptyMessage<any[]>()))),
      governancePresets: this.entitySvc.getDiscoveryGovernancePresets(8).pipe(catchError(() => of(this.emptyMessage<any[]>())))
    }).subscribe(({ monitors, entities, definitionActivities, governancePresets }) => {
      const monitorTotal = monitors.data?.totalElements ?? 0;
      const entityPage = entities.data;
      const entityTotal = entityPage?.totalElements ?? 0;
      const entitySamples = entityPage?.content ?? [];
      const hasEvidenceLinked = entitySamples.some(item => item.monitorCount > 0 || item.identityCount > 0 || item.entity?.source === 'otel_resource');
      const hasDefinition = entitySamples.some(item => item.definitionManaged) || (definitionActivities.data?.length ?? 0) > 0;
      const hasOwnershipBaseline = entitySamples.some(item => this.isPresent(item.entity?.owner) && this.isPresent(item.entity?.runbook));
      const hasGovernancePreset = (governancePresets.data?.length ?? 0) > 0;

      this.entryOptions = [
        {
          key: 'entity',
          title: this.t('layout.setup.entry.entity.title', '先建立第一个实体'),
          description: this.t(
            'layout.setup.entry.entity.copy',
            '如果你已经知道要管理的是哪个服务、主机、数据库或端点，先把它放进实体目录。'
          ),
          action: 'entities'
        },
        {
          key: 'direct',
          title: this.t('layout.setup.entry.direct.title', '从主程序直接接入'),
          description: this.t(
            'layout.setup.entry.direct.copy',
            '适合先接主机、数据库、站点和通用监控，最快跑通第一批指标。'
          ),
          action: 'monitors'
        },
        {
          key: 'collector',
          title: this.t('layout.setup.entry.collector.title', '安装采集器'),
          description: this.t(
            'layout.setup.entry.collector.copy',
            '适合远端主机、隔离网络和多节点采集，把采集能力分发到目标环境。'
          ),
          action: 'collector'
        },
        {
          key: 'otlp',
          title: this.t('layout.setup.entry.otlp.title', '通过 OTLP / OTel 接入'),
          description: this.t(
            'layout.setup.entry.otlp.copy',
            '适合应用日志、OpenTelemetry 资源属性和后续实体归并，不必等采集器部署完成。'
          ),
          action: 'otlp'
        }
      ];

      this.checklist = [
        {
          key: 'entity',
          icon: 'appstore',
          title: this.t('layout.setup.step.entity.title', '创建第一个实体'),
          description: this.t(
            'layout.setup.step.entity.copy',
            '先把服务、主机、数据库或端点放进实体目录，再逐步挂证据。'
          ),
          completed: entityTotal > 0,
          actionLabel: this.t('layout.setup.step.entity.action', '创建实体'),
          action: 'entities'
        },
        {
          key: 'monitoring',
          icon: 'deployment-unit',
          title: this.t('layout.setup.step.monitoring.title', '接入数据源'),
          description: this.t(
            'layout.setup.step.monitoring.copy',
            '实体建好后，再从主程序直连、采集器或 OTLP/OTel 三条路径里选一种，把第一批证据接进来。'
          ),
          completed: monitorTotal > 0,
          actionLabel: this.t('layout.setup.step.monitoring.action', '选择接入方式'),
          action: 'monitors'
        },
        {
          key: 'telemetry',
          icon: 'cluster',
          title: this.t('layout.setup.step.telemetry.title', '归并证据到实体'),
          description: this.t('layout.setup.step.telemetry.copy', '把监控、OTel 资源和身份标识挂到实体上。'),
          completed: hasEvidenceLinked,
          actionLabel: this.t('layout.setup.step.telemetry.action', '从遥测发现'),
          action: 'discovery'
        },
        {
          key: 'definition',
          icon: 'file-text',
          title: this.t('layout.setup.step.definition.title', '导入第一份实体定义'),
          description: this.t('layout.setup.step.definition.copy', '用 YAML、JSON 或 cURL 让目录定义可复用、可迁移。'),
          completed: hasDefinition,
          actionLabel: this.t('layout.setup.step.definition.action', '导入定义'),
          action: 'definition'
        },
        {
          key: 'ownership',
          icon: 'team',
          title: this.t('layout.setup.step.ownership.title', '补齐负责人和处置手册'),
          description: this.t('layout.setup.step.ownership.copy', '让实体不仅能看见，还能知道谁负责、怎么处理。'),
          completed: hasOwnershipBaseline,
          actionLabel: this.t('layout.setup.step.ownership.action', '回到实体目录'),
          action: 'entities'
        },
        {
          key: 'governance',
          icon: 'safety-certificate',
          title: this.t('layout.setup.step.governance.title', '建立共享治理基线'),
          description: this.t('layout.setup.step.governance.copy', '把通用 owner、system、source 规则沉成共享预设。'),
          completed: hasGovernancePreset,
          actionLabel: this.t('layout.setup.step.governance.action', '查看目录治理'),
          action: 'governance'
        }
      ];

      this.completedCount = this.checklist.filter(item => item.completed).length;
      this.totalCount = this.checklist.length;
      this.progressPercent = this.totalCount === 0 ? 0 : Math.round((this.completedCount / this.totalCount) * 100);
      this.progressHeadline = this.t('layout.setup.progress.headline', '你已完成 {percent}% 的平台配置').replace(
        '{percent}',
        `${this.progressPercent}`
      );
      this.progressSummary = this.t('layout.setup.progress.summary', '已完成 {done}/{total} 项启动任务')
        .replace('{done}', `${this.completedCount}`)
        .replace('{total}', `${this.totalCount}`);
      const nextItem = this.getNextChecklistItem();
      if (nextItem != null) {
        this.nextStepTitle = nextItem.title;
        this.nextStepCopy = nextItem.description;
        this.nextStepActionLabel = nextItem.actionLabel;
      } else {
        this.nextStepTitle = this.t('layout.setup.next.done.title', '目录基础能力已经就绪');
        this.nextStepCopy = this.t(
          'layout.setup.next.done.copy',
          '监控、实体、定义和治理入口都已打通，后面可以继续扩展证据、关系和治理深度。'
        );
        this.nextStepActionLabel = this.t('layout.setup.next.done.action', '回到实体目录');
      }
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  private getNextChecklistItem(): SetupChecklistItem | undefined {
    return this.checklist.find(item => !item.completed);
  }

  private isPresent(value?: string | null): boolean {
    return value != null && value.trim() !== '';
  }

  private emptyMessage<T>(): Message<T> {
    return { code: 0, msg: '', data: [] as T };
  }

  private emptyPageMessage<T>(): Message<Page<T>> {
    return {
      code: 0,
      msg: '',
      data: {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: 0,
        number: 0,
        numberOfElements: 0
      }
    };
  }
}
