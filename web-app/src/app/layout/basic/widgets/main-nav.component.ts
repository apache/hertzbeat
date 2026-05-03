import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, Inject, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

interface DarkOpsNavItem {
  key: string;
  labelKey: string;
  icon: string;
  link: string;
  matches: string[];
}

interface DarkOpsNavSection {
  key: string;
  titleKey: string;
  items: DarkOpsNavItem[];
}

@Component({
  standalone: false,
  selector: 'layout-main-nav',
  template: `
    <nav class="main-nav-rail-shell" [class.is-collapsed]="collapsed" [attr.aria-label]="translate('menu.main-nav')">
      @for (section of sections; track section.key) {
        <section class="main-nav-group">
          <div class="main-nav-title" nz-tooltip [nzTooltipTitle]="collapsed ? translate(section.titleKey) : null" nzTooltipPlacement="right">
            @if (!collapsed) {
              {{ translate(section.titleKey) }}
            }
          </div>

          @for (item of section.items; track item.key) {
            <div class="main-nav-entry">
              <button
                type="button"
                class="main-nav-item"
                [class.is-active]="isItemActive(item)"
                [class.is-open]="false"
                [attr.aria-label]="translate(item.labelKey)"
                nz-tooltip
                [nzTooltipTitle]="collapsed ? translate(item.labelKey) : null"
                nzTooltipPlacement="right"
                (click)="onItemClick(item)"
              >
                <span class="main-nav-active-marker" aria-hidden="true"></span>
                <span class="main-nav-item-data">
                  <span class="main-nav-icon-wrap">
                    <i class="main-nav-icon" nz-icon [nzType]="item.icon"></i>
                  </span>
                  @if (!collapsed) {
                    <span class="main-nav-item-label">{{ translate(item.labelKey) }}</span>
                  }
                </span>
              </button>
            </div>
          }
        </section>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainNavComponent implements OnInit {
  activeUrl = '';
  sections: DarkOpsNavSection[] = [];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly router: Router,
    private readonly settings: SettingsService,
    @Inject(ALAIN_I18N_TOKEN) private readonly i18n: I18NService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get collapsed(): boolean {
    return !!this.settings.layout.collapsed;
  }

  ngOnInit(): void {
    this.activeUrl = this.router.url;
    this.sections = this.buildSections();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.activeUrl = event.urlAfterRedirects;
        this.cdr.markForCheck();
      });

    this.settings.notify.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  isItemActive(item: DarkOpsNavItem): boolean {
    return item.matches.some(routePrefix => this.activeUrl.startsWith(routePrefix));
  }

  onItemClick(item: DarkOpsNavItem): void {
    void this.router.navigateByUrl(item.link);
  }

  translate(key: string): string {
    return this.i18n.fanyi(key);
  }

  private buildSections(): DarkOpsNavSection[] {
    return [
      {
        key: 'home',
        titleKey: 'menu.section.home',
        items: [{ key: 'home', labelKey: 'menu.home', icon: 'home', link: '/overview', matches: ['/overview'] }]
      },
      {
        key: 'objects',
        titleKey: 'menu.section.objects',
        items: [{ key: 'entities', labelKey: 'menu.entities', icon: 'deployment-unit', link: '/entities', matches: ['/entities'] }]
      },
      {
        key: 'alerts',
        titleKey: 'menu.section.alerts',
        items: [{ key: 'alerts', labelKey: 'menu.alerts', icon: 'alert', link: '/alert', matches: ['/alert', '/alerts'] }]
      },
      {
        key: 'dashboards',
        titleKey: 'menu.section.dashboards',
        items: [{ key: 'dashboards', labelKey: 'menu.dashboards', icon: 'dashboard', link: '/dashboard', matches: ['/dashboard'] }]
      },
      {
        key: 'observability',
        titleKey: 'menu.section.observability',
        items: [
          { key: 'ingestion', labelKey: 'menu.ingestion.center', icon: 'api', link: '/ingestion/otlp', matches: ['/ingestion/otlp'] },
          { key: 'metrics', labelKey: 'menu.ingestion.metrics', icon: 'area-chart', link: '/ingestion/otlp/metrics', matches: ['/ingestion/otlp/metrics'] },
          { key: 'logs', labelKey: 'menu.log.manage', icon: 'database', link: '/log/manage', matches: ['/log'] },
          { key: 'traces', labelKey: 'menu.trace.manage', icon: 'fork', link: '/trace/manage', matches: ['/trace'] },
          { key: 'topology', labelKey: 'menu.topology', icon: 'apartment', link: '/topology', matches: ['/topology'] },
          { key: 'exceptions', labelKey: 'menu.exceptions', icon: 'bug', link: '/exception', matches: ['/exception'] }
        ]
      },
      {
        key: 'monitoring',
        titleKey: 'menu.section.monitoring',
        items: [{ key: 'monitoring', labelKey: 'menu.monitoring', icon: 'fund', link: '/monitors', matches: ['/monitors'] }]
      },
      {
        key: 'settings',
        titleKey: 'menu.section.settings',
        items: [{ key: 'settings', labelKey: 'menu.settings', icon: 'setting', link: '/setting/settings', matches: ['/setting'] }]
      }
    ];
  }
}
