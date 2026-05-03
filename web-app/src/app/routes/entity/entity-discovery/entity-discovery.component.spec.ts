import { CommonModule } from '@angular/common';
import { Component, Input, NO_ERRORS_SCHEMA, Pipe, PipeTransform, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { EntityDiscoveryComponent } from './entity-discovery.component';
import { EntityService } from '../../../service/entity.service';
import { MonitorService } from '../../../service/monitor.service';

class MockI18nService {
  fanyi(key: string): string {
    return key;
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

@Pipe({ name: 'i18nElse', standalone: false })
class MockI18nElsePipe implements PipeTransform {
  transform(value: string, fallback?: string): string {
    return fallback ?? value;
  }
}

function createCandidate(entityId: number, options: { alreadyBound?: boolean } = {}): any {
  return {
    entityId,
    entityName: `entity-${entityId}`,
    score: '0.98',
    alreadyBound: options.alreadyBound ?? false
  };
}

function createRow(options: {
  id: number;
  owner?: string | null;
  system?: string | null;
  identities?: unknown[];
  candidates?: any[];
}): any {
  const candidates = options.candidates ?? [];
  return {
    monitor: {
      id: options.id,
      name: `monitor-${options.id}`,
      app: 'springboot3',
      instance: `10.0.0.${options.id}`
    },
    topCandidate: candidates[0],
    candidates,
    identityMatches: options.identities ?? [{ key: 'service.name', value: `svc-${options.id}` }],
    draftDto: {
      entity: {
        type: 'service',
        namespace: 'default',
        name: `svc-${options.id}`,
        owner: options.owner ?? 'team-a',
        system: options.system ?? 'system-a'
      }
    }
  };
}

function createComponent(): EntityDiscoveryComponent {
  const route = {
    snapshot: {
      queryParamMap: {
        get: () => null
      }
    },
    queryParamMap: of({
      get: () => null
    })
  } as any;
  const router = {
    navigate: jasmine.createSpy('navigate'),
    createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({
      toString: () => '/entities/discovery'
    }),
    url: '/entities/discovery'
  } as any;
  const entitySvc = {} as any;
  const monitorSvc = {} as any;
  const notifySvc = {} as any;
  const cdr = {
    markForCheck: jasmine.createSpy('markForCheck')
  } as any;

  return new EntityDiscoveryComponent(route, router, entitySvc, monitorSvc, notifySvc, cdr, new MockI18nService() as any);
}

describe('EntityDiscoveryComponent', () => {
  let fixture: ComponentFixture<EntityDiscoveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule],
      declarations: [EntityDiscoveryComponent, MockI18nElsePipe, MockNzSelectComponent, MockNzOptionComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null
              }
            },
            queryParamMap: of({
              get: () => null
            })
          }
        },
        { provide: ALAIN_I18N_TOKEN, useClass: MockI18NServiceAlias },
        {
          provide: EntityService,
          useValue: {
            getCatalogSuggestions: () => of({ code: 0, data: { owners: [], systems: [], labels: [] } }),
            getDiscoveryGovernancePresets: () => of({ code: 0, data: [] }),
            getDiscoveryGovernanceActivities: () => of({ code: 0, data: [] }),
            getDefinitionWorkspaceActivities: () => of({ code: 0, data: [] }),
            getDefinitionActivities: () => of({ code: 0, data: [] }),
            searchEntities: () =>
              of({
                code: 0,
                data: { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, numberOfElements: 0 }
              })
          }
        },
        {
          provide: MonitorService,
          useValue: {
            searchMonitors: () =>
              of({
                code: 0,
                data: { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, numberOfElements: 0 }
              })
          }
        },
        { provide: NzNotificationService, useValue: { success() {}, warning() {}, error() {} } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityDiscoveryComponent);
    fixture.detectChanges();
  });

  it('should keep discovery focused on search and candidate handling while moving cross-page actions to a side column', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-page-shell')).not.toBeNull();
    expect(root.querySelector('app-platform-rail-nav')).not.toBeNull();
    expect(root.querySelector('app-platform-stage-section')).not.toBeNull();
    expect(root.querySelector('.entity-inline-footer')).toBeNull();
    expect(root.querySelector('.catalog-rail .catalog-rail-group:nth-child(2)')).toBeNull();
    expect(root.querySelector('.discovery-first-screen .catalog-helper-row')).toBeNull();
    expect(root.querySelector('.discovery-console-split')).not.toBeNull();
    expect(root.querySelector('.discovery-side-column')).not.toBeNull();
    expect(root.querySelectorAll('.discovery-side-column .catalog-side-panel').length).toBe(1);
  });

  it('should render discovery support disclosures with shared platform support panels', () => {
    const component = fixture.componentInstance;
    component.telemetryDiscoveryRows = [createRow({ id: 1, candidates: [createCandidate(101)] })];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('app-platform-support-panel').length).toBe(2);
    expect(root.querySelector('details.workspace-support-details')).toBeNull();
  });

  it('should prioritize ownership remediation when visible rows still miss owner or system', () => {
    const component = createComponent();
    component.telemetryDiscoveryRows = [
      createRow({
        id: 1,
        owner: '',
        system: null,
        candidates: []
      }),
      createRow({
        id: 2,
        candidates: [createCandidate(201)]
      })
    ];

    expect(component.workspaceGuidanceHeadline).toContain('补充负责人和系统归属');
    expect(component.workspaceGuidancePrimaryAction?.key).toBe('focus-ownership');
    expect(component.workspaceGuidanceReasons.map(reason => reason.label)).toEqual(['当前范围', '待处理线索', '待补归属']);
    expect(component.workspaceGuidanceNextLinks.length).toBeLessThanOrEqual(3);
    expect(component.workspaceGuidanceNextLinks.every(link => !link.key.startsWith('policy-') && !link.key.startsWith('hook-'))).toBeTrue();
  });

  it('should use review as the first action when multiple candidates need confirmation', () => {
    const component = createComponent();
    component.telemetryDiscoveryRows = [
      createRow({
        id: 1,
        candidates: [createCandidate(101), createCandidate(102)]
      }),
      createRow({
        id: 2,
        candidates: [createCandidate(201)]
      })
    ];

    expect(component.workspaceGuidanceHeadline).toContain('确认归并目标');
    expect(component.workspaceGuidancePrimaryAction?.key).toBe('review');
    expect(component.workspaceGuidanceSecondaryAction?.key).toBe('select-merge');
    expect(component.workspaceGuidanceNextLinks.map(link => link.key)).toContain('select-merge');
  });

  it('should keep a single resume-first action when discovery is empty but a definition resume token exists', () => {
    const component = createComponent();
    component.definitionResumeToken = 'resume-token';
    component.telemetryDiscoveryRows = [];

    expect(component.workspaceGuidanceHeadline).toContain('返回定义工作台');
    expect(component.workspaceGuidancePrimaryAction?.key).toBe('definition-resume');
    expect(component.workspaceGuidanceSecondaryAction?.key).toBe('open-catalog');
    expect(component.workspaceGuidanceNextLinks.map(link => link.key)).toEqual(['open-catalog']);
  });
});

class MockI18NServiceAlias extends MockI18nService {}
