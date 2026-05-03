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

import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { EntityDto } from '../../../pojo/EntityDetail';
import { EntityService } from '../../../service/entity.service';
import { MonitorService } from '../../../service/monitor.service';
import { EntityEditorComponent } from './entity-editor.component';

describe('EntityEditorComponent workspace chrome', () => {
  function createComponent(queryParams: Record<string, string> = {}) {
    const route = {
      snapshot: { queryParams }
    } as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl'], {
      url: '/entities/42/edit'
    });
    const component = new EntityEditorComponent(
      route,
      router,
      jasmine.createSpyObj<EntityService>('EntityService', [
        'getEntityDetail',
        'searchEntities',
        'getCatalogSuggestions',
        'editEntity',
        'editEntityByDefinition',
        'newEntity',
        'newEntityBundleByDefinition'
      ]),
      jasmine.createSpyObj<MonitorService>('MonitorService', ['searchMonitors']),
      jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['success', 'warning', 'error']),
      { fanyi: (key: string) => key } as any
    );
    component.isEditMode = true;
    component.entityId = 42;
    component.entrySource = 'manual';
    component.editorSurfaceMode = 'editor';
    component.entity.name = 'checkout-api';
    component.entity.displayName = 'Checkout API';
    return { component, router };
  }

  it('should keep entity active and enable cross-workspace tabs in edit mode', () => {
    const { component } = createComponent();

    expect(component.workspaceTabs.find(tab => tab.key === 'entity')?.active).toBeTrue();
    expect(component.workspaceTabs.find(tab => tab.key === 'logs')?.disabled).toBeFalse();
  });

  it('should navigate to the monitor workspace with the current entity context', () => {
    const { component, router } = createComponent();

    component.onWorkspaceTabSelect('monitors');

    expect(router.navigate).toHaveBeenCalledWith(['/monitors'], {
      queryParams: jasmine.objectContaining({
        entityId: '42',
        entityName: 'Checkout API'
      })
    });
  });

  it('should return to detail with a relation result banner after saving relation-focused edits', () => {
    const { component, router } = createComponent({
      returnTo: '/entities/42?from=detail',
      focus: 'relations'
    });
    const entitySvc = component['entitySvc'] as jasmine.SpyObj<EntityService>;
    const payload = {
      entity: component.entity,
      relations: [{ targetEntityId: 88, relationType: 'depends_on' }]
    } as EntityDto;

    spyOn<any>(component, 'buildPayload').and.returnValue(payload);
    spyOn<any>(component, 'buildDefinitionRequest').and.returnValue({});
    entitySvc.editEntity.and.returnValue(of({ code: 0, msg: '', data: 42 } as any));

    component.onSave({ invalid: false, controls: {} } as any);

    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/entities/42?from=detail&responseResultKind=relations&responseResultAction=update&responseResultCount=1'
    );
  });

  it('should expose shared definition preview facts for the definition drawer summary', () => {
    const { component } = createComponent();
    component.definitionPreviewFormat = 'yaml';
    component.entityDto.identities = [{ identityKey: 'service.name', identityValue: 'checkout' } as any];
    component.entityDto.monitorBinds = [{ monitorId: 1 } as any];
    component.entityDto.relations = [{ sourceEntityId: 42, targetEntityId: 88 } as any];
    component.labelDrafts = [{ key: 'tier', value: 'critical' } as any];
    component.linkDrafts = [{ title: 'runbook', url: 'https://example.com' } as any];
    component.contactDrafts = [{ name: 'oncall', value: 'platform' } as any];

    expect(component.definitionPreviewFacts).toEqual([
      { label: 'entity.definition.preview-format', value: 'YAML' },
      { label: 'entity.section.identities', value: '1' },
      { label: 'entity.section.monitors', value: '1' },
      { label: 'entity.editor.relations-and-labels', value: '4' }
    ]);
    expect(component.definitionPreviewToolbarBadges).toEqual(['YAML']);
  });

  it('should expose a shared definition preview section title', () => {
    const { component } = createComponent();

    expect(component.definitionPreviewSectionTitle).toBe('Entity Definition Preview');
  });

  it('should expose shared editor stage title and description', () => {
    const { component } = createComponent();
    component.activeEditorStage = 'evidence';

    expect(component.activeEditorStageTitle).toBe('证据关联');
    expect(component.activeEditorStageDescription).toBe('把身份标识和监控证据接上，让目录能接住实时证据。');
  });
});
