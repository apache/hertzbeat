import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';

import { MainNavComponent } from './main-nav.component';

@Component({
  standalone: true,
  template: ''
})
class DummyRouteComponent {}

class MockSettingsService {
  layout = { collapsed: false };
  notify = of(void 0);
}

class MockI18nService {
  fanyi(key: string): string {
    const map: Record<string, string> = {
      'menu.main-nav': '主导航',
      'menu.section.home': '首页',
      'menu.section.objects': '对象',
      'menu.section.alerts': '告警',
      'menu.section.dashboards': '仪表盘',
      'menu.section.observability': '可观测',
      'menu.section.monitoring': '监控',
      'menu.section.settings': '设置',
      'menu.home': '首页',
      'menu.entities': '对象目录',
      'menu.alerts': '告警中心',
      'menu.dashboards': '仪表盘',
      'menu.observability': '可观测',
      'menu.monitoring': '监控中心',
      'menu.settings': '设置',
      'menu.ingestion.center': 'OTLP 接入',
      'menu.ingestion.metrics': '指标工作台',
      'menu.log.manage': '日志工作台',
      'menu.trace.manage': '链路工作台',
      'menu.topology': '拓扑',
      'menu.exceptions': '异常'
    };
    return map[key] ?? key;
  }
}

describe('MainNavComponent', () => {
  let fixture: ComponentFixture<MainNavComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MainNavComponent],
      providers: [
        provideRouter([
          { path: 'overview', component: DummyRouteComponent },
          { path: 'alerts', component: DummyRouteComponent },
          { path: 'setting', redirectTo: 'setting/settings', pathMatch: 'full' },
          { path: 'setting/settings', component: DummyRouteComponent }
        ]),
        provideNoopAnimations(),
        { provide: SettingsService, useClass: MockSettingsService },
        { provide: ALAIN_I18N_TOKEN, useClass: MockI18nService },
        { provide: I18NService, useClass: MockI18nService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    router = TestBed.inject(Router);
    await router.navigateByUrl('/overview');

    fixture = TestBed.createComponent(MainNavComponent);
    fixture.detectChanges();
  });

  it('should render grouped nav sections with a compact active marker', () => {
    const root = fixture.nativeElement as HTMLElement;
    const groups = root.querySelectorAll('.main-nav-group');
    const activeItem = root.querySelector('.main-nav-item.is-active');
    const marker = root.querySelector('.main-nav-active-marker');
    const firstItem = root.querySelector('.main-nav-item');

    expect(groups.length).toBe(7);
    expect(activeItem).not.toBeNull();
    expect(marker).not.toBeNull();
    expect(firstItem?.getAttribute('aria-label')).toBe('首页');
  });

  it('should regroup first-level navigation into home, objects, alerts, dashboards, observability, monitoring and settings domains', () => {
    const root = fixture.nativeElement as HTMLElement;
    const groupTitles = Array.from(root.querySelectorAll('.main-nav-title')).map(item => item.textContent?.trim()).filter(Boolean);
    const itemLabels = Array.from(root.querySelectorAll('.main-nav-item')).map(item => item.getAttribute('aria-label'));

    expect(groupTitles).toEqual(['首页', '对象', '告警', '仪表盘', '可观测', '监控', '设置']);
    expect(itemLabels).toEqual([
      '首页',
      '对象目录',
      '告警中心',
      '仪表盘',
      'OTLP 接入',
      '指标工作台',
      '日志工作台',
      '链路工作台',
      '拓扑',
      '异常',
      '监控中心',
      '设置'
    ]);
  });

  it('should route settings entry to the real settings shell', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const settingsButton = root.querySelector('.main-nav-item[aria-label="设置"]') as HTMLButtonElement;

    settingsButton.click();
    await fixture.whenStable();

    expect(router.url).toBe('/setting/settings');
  });
});
