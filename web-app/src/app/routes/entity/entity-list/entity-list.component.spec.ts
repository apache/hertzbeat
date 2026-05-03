import { CommonModule } from '@angular/common';
import { Component, Input, NO_ERRORS_SCHEMA, Pipe, PipeTransform, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { of } from 'rxjs';

import { EntityCatalogSuggestions } from '../../../pojo/EntityCatalogSuggestions';
import { EntityService } from '../../../service/entity.service';
import { EntityListComponent } from './entity-list.component';
import { getEntityRailDisplayLabel } from '../entity-rail-label.util';

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    const map: Record<string, string> = {
      'menu.monitor.entities': '对象目录',
      'entity.list.console.kicker': '对象优先调查',
      'entity.list.console.title': '围绕服务、资源与实体定位问题并进入调查',
      'entity.list.console.title.type': '围绕当前类型对象继续定位问题',
      'entity.list.console.copy':
        '先按对象筛出风险，再决定进入日志、链路、指标还是告警工作台。',
      'entity.list.console.copy.type': '先查看这一类对象的状态和证据，再进入对应工作台。',
      'entity.list.console.total': '对象总数',
      'entity.list.console.active-alerts': '活跃异常对象',
      'entity.list.console.risky': '高风险对象',
      'entity.list.console.logs': '有日志对象',
      'entity.list.console.traces': '有链路对象',
      'entity.list.welcome.section.setup': '开始搭建目录'
    };
    return map[value] ?? value;
  }
}

@Component({
  selector: 'nz-select',
  template: '<ng-content></ng-content>',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MockNzSelectComponent),
      multi: true
    }
  ],
  standalone: false
})
class MockNzSelectComponent implements ControlValueAccessor {
  @Input() nzAllowClear?: boolean;
  @Input() nzPlaceHolder?: string;
  @Input() nzSize?: string;

  writeValue(): void {}

  registerOnChange(): void {}

  registerOnTouched(): void {}

  setDisabledState(): void {}
}

@Component({
  selector: 'nz-option',
  template: '',
  standalone: false
})
class MockNzOptionComponent {
  @Input() nzValue: unknown;
  @Input() nzLabel?: string;
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

class MockI18nService {
  fanyi(key: string): string {
    const map: Record<string, string> = {
      'menu.monitor.entities': '对象目录',
      'entity.list.console.title': '围绕服务、资源与实体定位问题并进入调查',
      'entity.list.console.title.type': '围绕当前类型对象继续定位问题',
      'entity.list.console.copy':
        '先按对象筛出风险，再决定进入日志、链路、指标还是告警工作台。',
      'entity.list.console.copy.type': '先查看这一类对象的状态和证据，再进入对应工作台。'
    };
    return map[key] ?? key;
  }
}

describe('EntityListComponent source-first workbench', () => {
  let fixture: ComponentFixture<EntityListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule],
      declarations: [
        EntityListComponent,
        MockI18nPipe,
        MockNzSelectComponent,
        MockNzOptionComponent,
        MockPlatformFactsStripComponent
      ],
      providers: [
        { provide: ALAIN_I18N_TOKEN, useClass: MockI18nService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({})
            }
          }
        },
        {
          provide: SettingsService,
          useValue: {
            user: { name: 'platform' }
          }
        },
        {
          provide: EntityService,
          useValue: {
            searchEntities: () =>
              of({
                code: 0,
                data: {
                  content: [],
                  totalElements: 0,
                  totalPages: 0,
                  size: 200,
                  number: 0,
                  numberOfElements: 0
                }
              }),
            getCatalogSuggestions: () =>
              of({
                code: 0,
                data: new EntityCatalogSuggestions()
              }),
            getDiscoveryGovernancePresets: () => of({ code: 0, data: [] }),
            getDefinitionWorkspaceActivities: () => of({ code: 0, data: [] }),
            getDiscoveryGovernanceActivities: () => of({ code: 0, data: [] })
          }
        },
        { provide: NzNotificationService, useValue: { success() {}, warning() {}, error() {} } },
        { provide: NzModalService, useValue: { confirm() {}, create() {} } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityListComponent);
    fixture.detectChanges();
  });

  it('should render the catalog list as filter-and-list first with a persistent side column when the catalog is empty', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-page-shell')).not.toBeNull();
    expect(root.querySelector('app-platform-rail-nav')).not.toBeNull();
    expect(root.querySelector('app-platform-stage-section')).not.toBeNull();
    expect(root.querySelector('app-platform-facts-strip')).not.toBeNull();
    expect(root.querySelector('.catalog-console-split')).not.toBeNull();
    expect(root.querySelector('.catalog-side-column')).not.toBeNull();
    expect(root.querySelectorAll('.catalog-side-column .catalog-side-panel').length).toBe(1);
    expect(root.querySelector('.catalog-helper-row')).toBeNull();
    expect(root.querySelector('.catalog-intent-strip')).toBeNull();
    expect(root.querySelector('.catalog-empty-shell')).not.toBeNull();
    expect(root.querySelector('.catalog-side-panel-hint')).not.toBeNull();
    expect(root.querySelector('.catalog-side-panel .catalog-setup-card.catalog-setup-card--setup')).toBeNull();
    expect(root.textContent).toContain('对象总数');
    expect(root.textContent).toContain('活跃异常对象');
    expect(root.textContent).toContain('高风险对象');
    expect(root.textContent).toContain('有日志对象');
    expect(root.textContent).toContain('有链路对象');
    expect(root.textContent).toContain('开始搭建目录');
  });

  it('should expose shortened rail labels for narrow navigation items', () => {
    expect(getEntityRailDisplayLabel('k8s_workload', 'K8s 工作负载')).toBe('K8s 负载');
  });
});
