/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CommonModule, DatePipe, KeyValuePipe } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ALAIN_I18N_TOKEN, MenuService } from '@delon/theme';

import { OpsWorkspaceFacade } from '../../../core/ops-workspace/ops-workspace.facade';
import { EntityDetail, EntityDto } from '../../../pojo/EntityDetail';
import { EntityService } from '../../../service/entity.service';
import { MemoryStorageService } from '../../../service/memory-storage.service';
import { MonitorService } from '../../../service/monitor.service';
import { MonitorListComponent } from './monitor-list.component';

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

@Pipe({ name: 'date', standalone: false })
class MockDatePipe implements PipeTransform {
  transform(value: any): any {
    return value;
  }
}

@Pipe({ name: 'elapsedTime', standalone: false })
class MockElapsedTimePipe implements PipeTransform {
  transform(value: any): any {
    return value;
  }
}

describe('MonitorListComponent workspace chrome', () => {
  function createPage<T>(content: T[] = []) {
    return {
      content,
      totalPages: 1,
      totalElements: content.length,
      size: 8,
      number: 0,
      numberOfElements: content.length
    };
  }

  function createComponent() {
    const route = {
      snapshot: { queryParams: {} },
      queryParamMap: { subscribe: () => ({ unsubscribe() {} }) }
    } as unknown as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl'], {
      url: '/monitors?entityId=42'
    });
    const component = new MonitorListComponent(
      route,
      router,
      jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm', 'create']),
      jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['success', 'warning', 'error']),
      jasmine.createSpyObj<MonitorService>('MonitorService', ['searchMonitors']),
      jasmine.createSpyObj<EntityService>('EntityService', ['getEntityDetail']),
      jasmine.createSpyObj<MemoryStorageService>('MemoryStorageService', ['getData']),
      { change: { subscribe() {} } } as any,
      { fanyi: (key: string) => key } as any,
      new OpsWorkspaceFacade()
    );
    component.entityIdContext = '42';
    component.entityNameContext = 'Checkout Service';
    component.filterContent = 'checkout';
    component.returnLabel = 'Checkout Service';
    return { component, router };
  }

  it('should not expose cross-workbench tabs in the management list view', () => {
    const { component } = createComponent();

    expect(component.workspaceTabs.length).toBe(0);
  });

  it('should keep the workspace rail disabled even when entity context is available', () => {
    const { component } = createComponent();
    component.entityIdContext = '42';

    expect(component.showWorkspaceRail).toBeFalse();
  });

  it('should keep a management-oriented monitor title while exposing the active filter count', () => {
    const { component } = createComponent();
    component.app = 'mysql';
    component.labels = 'team=platform';
    component.filterStatus = 2;

    expect(component.monitorWorkbenchTitle).toBe('menu.monitor.center');
    expect(component.activeFilterCount).toBe(5);
  });

  it('should expose shared workbench facts for the top summary strip', () => {
    const { component } = createComponent();
    component.total = 12;
    component.monitors = [{ id: 1, status: 2, app: 'mysql' }, { id: 2, status: 1, app: 'redis' }] as any;
    component.app = 'mysql';
    component.labels = 'team=platform';
    component.filterStatus = 2;

    expect(component.monitorWorkbenchFacts).toEqual([
      { label: 'monitor.center.console.result.total', value: '12' },
      { label: 'monitor.center.console.result.down', value: '1', tone: 'critical' },
      { label: 'monitor.center.console.result.apps', value: '2' },
      { label: 'monitor.center.console.result.filters', value: '5', tone: 'accent' }
    ]);
  });

  it('should expose shared result meta chips for the selected monitor count', () => {
    const { component } = createComponent();
    component.checkedMonitorIds = new Set([1, 2, 3]);

    expect(component.monitorResultsMetaChips).toEqual([{ text: 'monitor.center.console.result.selected 3', tone: 'accent' }]);
  });

  it('should expose a meaningful empty-state copy for filtered and unfiltered result sets', () => {
    const { component } = createComponent();

    expect(component.monitorResultsEmptyTitle).toBe('当前范围内没有监控结果');
    expect(component.monitorResultsEmptyCopy).toBe('当前筛选条件下没有匹配的监控，可以调整筛选条件后重新查看。');

    component.filterContent = '';
    component.entityIdContext = undefined;
    component.entityNameContext = undefined;
    component.returnLabel = undefined;

    expect(component.activeFilterCount).toBe(0);
    expect(component.monitorResultsEmptyCopy).toBe('当前还没有可展示的监控结果，可以刷新视图或新建监控后再回来查看。');
  });

  it('should expose shared empty-state action items for the monitor result callout', () => {
    const { component } = createComponent();
    component.entityIdContext = undefined;
    component.entityNameContext = undefined;
    component.returnTo = undefined;

    expect(component.monitorResultsEmptyActionItems).toEqual([
      { key: 'refresh', label: 'monitor.center.console.action.refresh', tone: 'primary' },
      { key: 'new', label: 'monitor.center.console.action.new', tone: 'default' }
    ]);

    component.entityIdContext = '42';

    expect(component.monitorResultsEmptyActionItems).toEqual([
      { key: 'refresh', label: 'monitor.center.console.action.refresh', tone: 'primary' }
    ]);
  });

  it('should route shared empty-state actions to the existing handlers', () => {
    const { component } = createComponent();
    spyOn(component, 'sync');
    spyOn(component, 'onAppSwitchModalOpen');

    component.onMonitorResultsEmptyAction('refresh');
    expect(component.sync).toHaveBeenCalled();

    component.onMonitorResultsEmptyAction('new');
    expect(component.onAppSwitchModalOpen).toHaveBeenCalled();
  });

  it('should sync entity context into the global workspace facade on init', () => {
    const route = {
      snapshot: { queryParams: {} },
      queryParamMap: of(
        convertToParamMap({
          entityId: '42',
          entityName: 'Checkout Service',
          content: 'checkout',
          returnLabel: 'Checkout Service'
        })
      )
    } as unknown as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl'], {
      url: '/monitors?entityId=42'
    });
    const entitySvc = jasmine.createSpyObj<EntityService>('EntityService', ['getEntityDetail']);
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', ['searchMonitors']);
    const workspace = new OpsWorkspaceFacade();
    const detail = new EntityDetail();
    detail.entity = {
      entity: {
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API',
        type: 'service'
      }
    } as EntityDto;
    entitySvc.getEntityDetail.and.returnValue(of({ code: 0, msg: '', data: detail }));
    monitorSvc.searchMonitors.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: createPage<any>()
      })
    );

    const component = new MonitorListComponent(
      route,
      router,
      jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm', 'create']),
      jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['success', 'warning', 'error']),
      monitorSvc,
      entitySvc,
      jasmine.createSpyObj<MemoryStorageService>('MemoryStorageService', ['getData']),
      { change: { subscribe() {} } } as any,
      { fanyi: (key: string) => key } as any,
      workspace
    );

    component.ngOnInit();

    expect(workspace.selectedEntity()).toEqual({
      id: '42',
      name: 'Checkout API',
      type: 'service'
    });
    expect(workspace.queryContext()).toEqual({
      route: '/monitors',
      params: {
        entityId: '42',
        entityName: 'Checkout Service',
        content: 'checkout',
        returnLabel: 'Checkout Service'
      }
    });
  });

  it('should render the empty state with the shared drawer callout card', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', ['searchMonitors']);
    const entitySvc = jasmine.createSpyObj<EntityService>('EntityService', ['getEntityDetail']);
    monitorSvc.searchMonitors.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: createPage<any>()
      })
    );

    await TestBed.configureTestingModule({
      declarations: [MonitorListComponent, MockI18nPipe, MockDatePipe, MockElapsedTimePipe],
      imports: [CommonModule, FormsModule, NoopAnimationsModule, NzCheckboxModule, NzSelectModule, NzDropDownModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
            queryParamMap: of(convertToParamMap({}))
          }
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl'], { url: '/monitors' })
        },
        { provide: NzModalService, useValue: jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm', 'create']) },
        {
          provide: NzNotificationService,
          useValue: jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['success', 'warning', 'error'])
        },
        { provide: MonitorService, useValue: monitorSvc },
        { provide: EntityService, useValue: entitySvc },
        { provide: MemoryStorageService, useValue: jasmine.createSpyObj<MemoryStorageService>('MemoryStorageService', ['getData']) },
        { provide: MenuService, useValue: { change: { subscribe() {} } } },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } },
        DatePipe,
        KeyValuePipe,
        OpsWorkspaceFacade
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture: ComponentFixture<MonitorListComponent> = TestBed.createComponent(MonitorListComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-platform-drawer-callout-card.monitor-results-empty-state--flat')).not.toBeNull();
    expect(host.querySelector('div.monitor-results-empty-state')).toBeNull();
    expect(host.querySelector('app-platform-support-action-bar.monitor-results-empty-actions')).not.toBeNull();
  });

  it('should expose shared support action items for entity monitor links', () => {
    const { component } = createComponent();
    const monitor = {
      id: 1,
      name: 'checkout-api'
    } as any;

    spyOn(component, 'getMonitorCodeNavigationUrl').and.returnValue('https://repo.local/checkout-api');

    expect(component.getMonitorCardActionItems(monitor)).toEqual([
      { key: 'related-logs', label: 'entity.response.open-related-logs' },
      { key: 'related-traces', label: 'entity.response.open-related-traces' },
      { key: 'code', label: 'entity.response.open-code', disabled: false }
    ]);
  });
});
