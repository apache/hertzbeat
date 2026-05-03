import { CommonModule } from '@angular/common';
import { Component, Input, NO_ERRORS_SCHEMA, Pipe, PipeTransform, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { EntityService } from '../../../service/entity.service';
import { EntityDefinitionWorkspaceComponent } from './entity-definition-workspace.component';

@Pipe({ name: 'i18nElse', standalone: false })
class MockI18nElsePipe implements PipeTransform {
  transform(_key: string, fallback: string): string {
    return fallback;
  }
}

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    return value;
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

describe('EntityDefinitionWorkspaceComponent', () => {
  let fixture: ComponentFixture<EntityDefinitionWorkspaceComponent>;

  beforeEach(async () => {
    const entitySvc = jasmine.createSpyObj('EntityService', [
      'getEntity',
      'parseEntityDefinitions',
      'importEntityDefinitions',
      'updateEntityDefinition',
      'getDefinitionWorkspaceTemplates',
      'getDefinitionWorkspaceActivities',
      'getDefinitionActivities',
      'getDiscoveryGovernanceActivities',
      'getCatalogSuggestions',
      'searchEntities'
    ]) as jasmine.SpyObj<EntityService>;
    entitySvc.getDefinitionWorkspaceTemplates.and.returnValue(of({ code: 0, data: [] } as any));
    entitySvc.getDefinitionWorkspaceActivities.and.returnValue(of({ code: 0, data: [] } as any));
    entitySvc.getDefinitionActivities.and.returnValue(of({ code: 0, data: [] } as any));
    entitySvc.getDiscoveryGovernanceActivities.and.returnValue(of({ code: 0, data: [] } as any));
    entitySvc.getCatalogSuggestions.and.returnValue(of({ code: 0, data: {} } as any));
    entitySvc.searchEntities.and.returnValue(of({ code: 0, data: { content: [] } } as any));

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule],
      declarations: [
        EntityDefinitionWorkspaceComponent,
        MockI18nElsePipe,
        MockI18nPipe,
        MockNzSelectComponent,
        MockNzOptionComponent
      ],
      providers: [
        { provide: EntityService, useValue: entitySvc },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({})
            },
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({}))
          }
        },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['success', 'warning', 'error']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityDefinitionWorkspaceComponent);
    fixture.detectChanges();
  });

  it('should render definition workspace inside app-page-shell', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-page-shell')).not.toBeNull();
    expect(root.querySelector('app-platform-rail-nav')).not.toBeNull();
    expect(root.querySelector('app-platform-stage-section')).not.toBeNull();
    expect(root.querySelector('.definition-workspace-grid')).not.toBeNull();
    expect(root.querySelector('.definition-editor-card')).not.toBeNull();
  });

  it('should expose shared import summary facts for the preview overview', () => {
    const component = fixture.componentInstance;

    component.importPreviewScope = 'all';
    component.importPreviewDtos = [
      {
        entity: { name: 'ready-service', type: 'service', source: 'manual' },
        monitorBinds: [{ type: 'http', host: 'svc.example.com' }],
        identities: []
      } as any,
      {
        entity: { name: 'needs-owner', type: 'service', source: 'manual' },
        monitorBinds: [{ type: 'http', host: 'svc.example.com' }],
        identities: []
      } as any,
      {
        entity: { name: 'needs-telemetry', type: 'service', source: 'manual' },
        monitorBinds: [],
        identities: []
      } as any
    ];
    component.importPreviewRows = [
      {
        dto: component.importPreviewDtos[0],
        title: 'ready-service',
        kindLabel: '服务',
        sourceLabel: '手动',
        telemetryLabel: '已关联',
        gapKeys: [],
        gaps: [],
        validationColor: 'success',
        validationLabel: '可直接导入',
        readinessScore: 100
      } as any,
      {
        dto: component.importPreviewDtos[1],
        title: 'needs-owner',
        kindLabel: '服务',
        sourceLabel: '手动',
        telemetryLabel: '已关联',
        gapKeys: ['owner'],
        gaps: ['负责人'],
        validationColor: 'warning',
        validationLabel: '建议补齐',
        readinessScore: 75
      } as any,
      {
        dto: component.importPreviewDtos[2],
        title: 'needs-telemetry',
        kindLabel: '服务',
        sourceLabel: '手动',
        telemetryLabel: '缺少遥测',
        gapKeys: ['telemetry'],
        gaps: ['遥测绑定'],
        validationColor: 'default',
        validationLabel: '缺少遥测绑定',
        readinessScore: 50
      } as any
    ];

    expect(component.importSummaryFacts).toEqual([
      jasmine.objectContaining({ label: '可直接导入', value: '1', tone: 'success' }),
      jasmine.objectContaining({ label: '建议补齐', value: '2', tone: 'warning' }),
      jasmine.objectContaining({ label: '缺少遥测绑定', value: '1', tone: 'default' })
    ]);
  });
});
