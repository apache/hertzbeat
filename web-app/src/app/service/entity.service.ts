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

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { EntityCatalogSuggestions } from '../pojo/EntityCatalogSuggestions';
import { EntityDefinitionFormat, EntityDefinitionRequest } from '../pojo/EntityDefinition';
import {
  EntityAlertPage,
  EntityDefinitionActivity,
  EntityDetail,
  EntityDto,
  EntityMonitorPage,
  EntityTriageSummary
} from '../pojo/EntityDetail';
import { DefinitionImportActivity } from '../pojo/EntityDefinitionWorkspaceActivity';
import { EntityDefinitionWorkspaceResume } from '../pojo/EntityDefinitionWorkspaceResume';
import { DefinitionWorkspaceTemplate } from '../pojo/EntityDefinitionWorkspaceTemplate';
import { EntityDiscoveryGovernanceActivity, EntityDiscoveryGovernancePreset } from '../pojo/EntityDiscoveryGovernance';
import { EntityMonitorBindingCandidate } from '../pojo/EntityMonitorBindingCandidate';
import { EntitySummary } from '../pojo/EntitySummary';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const entityUri = '/entities';

@Injectable({
  providedIn: 'root'
})
export class EntityService {
  constructor(private http: HttpClient) {}

  public newEntity(body: EntityDto): Observable<Message<number>> {
    return this.http.post<Message<number>>(entityUri, body);
  }

  public editEntity(body: EntityDto): Observable<Message<void>> {
    return this.http.put<Message<void>>(entityUri, body);
  }

  public getEntity(entityId: number): Observable<Message<EntityDto>> {
    return this.http.get<Message<EntityDto>>(`${entityUri}/${entityId}`);
  }

  public getEntityDetail(entityId: number): Observable<Message<EntityDetail>> {
    return this.http.get<Message<EntityDetail>>(`${entityUri}/${entityId}/detail`);
  }

  public getEntityAlerts(
    entityId: number,
    pageIndex = 0,
    pageSize = 10,
    severity?: string | null,
    status?: string | null
  ): Observable<Message<EntityAlertPage>> {
    let params = new HttpParams().append('pageIndex', pageIndex).append('pageSize', pageSize);
    if (severity != null && severity.trim() !== '') {
      params = params.append('severity', severity.trim());
    }
    if (status != null && status.trim() !== '') {
      params = params.append('status', status.trim());
    }
    return this.http.get<Message<EntityAlertPage>>(`${entityUri}/${entityId}/alerts`, { params });
  }

  public getEntityMonitors(
    entityId: number,
    status?: number | null,
    app?: string | null,
    pageIndex = 0,
    pageSize = 10
  ): Observable<Message<EntityMonitorPage>> {
    let params = new HttpParams().append('pageIndex', pageIndex).append('pageSize', pageSize);
    if (status != null) {
      params = params.append('status', status);
    }
    if (app != null && app.trim() !== '') {
      params = params.append('app', app.trim());
    }
    return this.http.get<Message<EntityMonitorPage>>(`${entityUri}/${entityId}/monitors`, { params });
  }

  public generateEntityTriageSummary(entityId: number): Observable<Message<EntityTriageSummary>> {
    return this.http.post<Message<EntityTriageSummary>>(`${entityUri}/${entityId}/triage-summary`, {});
  }

  public getDefinitionActivities(entityId?: number, limit = 12): Observable<Message<EntityDefinitionActivity[]>> {
    let httpParams = new HttpParams().append('limit', limit);
    if (entityId != null) {
      httpParams = httpParams.append('entityId', entityId);
    }
    return this.http.get<Message<EntityDefinitionActivity[]>>(`${entityUri}/definition-activities`, { params: httpParams });
  }

  public getDefinitionWorkspaceTemplates(limit = 8, templateId?: string): Observable<Message<DefinitionWorkspaceTemplate[]>> {
    let httpParams = new HttpParams().append('limit', limit);
    if (templateId != null && templateId.trim() !== '') {
      httpParams = httpParams.append('templateId', templateId.trim());
    }
    return this.http.get<Message<DefinitionWorkspaceTemplate[]>>(`${entityUri}/definition/templates`, { params: httpParams });
  }

  public saveDefinitionWorkspaceTemplate(body: DefinitionWorkspaceTemplate): Observable<Message<DefinitionWorkspaceTemplate>> {
    return this.http.post<Message<DefinitionWorkspaceTemplate>>(`${entityUri}/definition/templates`, body);
  }

  public deleteDefinitionWorkspaceTemplate(templateId: string): Observable<Message<void>> {
    return this.http.delete<Message<void>>(`${entityUri}/definition/templates/${encodeURIComponent(templateId)}`);
  }

  public getDefinitionWorkspaceActivities(limit = 8, activityId?: string): Observable<Message<DefinitionImportActivity[]>> {
    let httpParams = new HttpParams().append('limit', limit);
    if (activityId != null && activityId.trim() !== '') {
      httpParams = httpParams.append('activityId', activityId.trim());
    }
    return this.http.get<Message<DefinitionImportActivity[]>>(`${entityUri}/definition/workspace-activities`, {
      params: httpParams
    });
  }

  public saveDefinitionWorkspaceActivity(body: DefinitionImportActivity): Observable<Message<DefinitionImportActivity>> {
    return this.http.post<Message<DefinitionImportActivity>>(`${entityUri}/definition/workspace-activities`, body);
  }

  public getDefinitionWorkspaceResume(token: string): Observable<Message<EntityDefinitionWorkspaceResume>> {
    const httpParams = new HttpParams().append('token', token);
    return this.http.get<Message<EntityDefinitionWorkspaceResume>>(`${entityUri}/definition/workspace-resumes`, { params: httpParams });
  }

  public saveDefinitionWorkspaceResume(body: EntityDefinitionWorkspaceResume): Observable<Message<EntityDefinitionWorkspaceResume>> {
    return this.http.post<Message<EntityDefinitionWorkspaceResume>>(`${entityUri}/definition/workspace-resumes`, body);
  }

  public deleteDefinitionWorkspaceResume(token: string): Observable<Message<void>> {
    return this.http.delete<Message<void>>(`${entityUri}/definition/workspace-resumes/${encodeURIComponent(token)}`);
  }

  public getDiscoveryGovernancePresets(limit = 8): Observable<Message<EntityDiscoveryGovernancePreset[]>> {
    const httpParams = new HttpParams().append('limit', limit);
    return this.http.get<Message<EntityDiscoveryGovernancePreset[]>>(`${entityUri}/discovery/governance-presets`, {
      params: httpParams
    });
  }

  public saveDiscoveryGovernancePreset(body: EntityDiscoveryGovernancePreset): Observable<Message<EntityDiscoveryGovernancePreset>> {
    return this.http.post<Message<EntityDiscoveryGovernancePreset>>(`${entityUri}/discovery/governance-presets`, body);
  }

  public deleteDiscoveryGovernancePreset(presetId: string): Observable<Message<void>> {
    return this.http.delete<Message<void>>(`${entityUri}/discovery/governance-presets/${encodeURIComponent(presetId)}`);
  }

  public getDiscoveryGovernanceActivities(limit = 8, activityId?: string): Observable<Message<EntityDiscoveryGovernanceActivity[]>> {
    let httpParams = new HttpParams().append('limit', limit);
    if (activityId != null && activityId.trim() !== '') {
      httpParams = httpParams.append('activityId', activityId.trim());
    }
    return this.http.get<Message<EntityDiscoveryGovernanceActivity[]>>(`${entityUri}/discovery/governance-activities`, {
      params: httpParams
    });
  }

  public saveDiscoveryGovernanceActivity(body: EntityDiscoveryGovernanceActivity): Observable<Message<EntityDiscoveryGovernanceActivity>> {
    return this.http.post<Message<EntityDiscoveryGovernanceActivity>>(`${entityUri}/discovery/governance-activities`, body);
  }

  public getCatalogSuggestions(limit = 120): Observable<Message<EntityCatalogSuggestions>> {
    const httpParams = new HttpParams().append('limit', limit);
    return this.http.get<Message<EntityCatalogSuggestions>>(`${entityUri}/catalog-suggestions`, { params: httpParams });
  }

  public getEntityDefinition(entityId: number, format: Exclude<EntityDefinitionFormat, 'curl'>): Observable<Message<string>> {
    let httpParams = new HttpParams();
    httpParams = httpParams.append('format', format);
    return this.http.get<Message<string>>(`${entityUri}/${entityId}/definition`, { params: httpParams });
  }

  public deleteEntity(entityId: number): Observable<Message<void>> {
    return this.http.delete<Message<void>>(`${entityUri}/${entityId}`);
  }

  public parseEntityDefinition(body: EntityDefinitionRequest): Observable<Message<EntityDto>> {
    return this.http.post<Message<EntityDto>>(`${entityUri}/definition/parse`, body);
  }

  public parseEntityDefinitionBundle(body: EntityDefinitionRequest): Observable<Message<EntityDto[]>> {
    return this.http.post<Message<EntityDto[]>>(`${entityUri}/definition/bundle/parse`, body);
  }

  public newEntityByDefinition(body: EntityDefinitionRequest): Observable<Message<number>> {
    return this.http.post<Message<number>>(`${entityUri}/definition`, body);
  }

  public newEntityBundleByDefinition(body: EntityDefinitionRequest): Observable<Message<number[]>> {
    return this.http.post<Message<number[]>>(`${entityUri}/definition/bundle`, body);
  }

  public editEntityByDefinition(entityId: number, body: EntityDefinitionRequest): Observable<Message<void>> {
    return this.http.put<Message<void>>(`${entityUri}/${entityId}/definition`, body);
  }

  public searchEntities(
    type: string | undefined,
    status: string | undefined,
    owner: string | undefined,
    source: string | undefined,
    search: string | undefined,
    pageIndex: number,
    pageSize: number,
    sortField?: string | null,
    sortOrder?: string | null,
    environment?: string | undefined,
    lifecycle?: string | undefined,
    tier?: string | undefined,
    system?: string | undefined
  ): Observable<Message<Page<EntitySummary>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (type != undefined && type != '') {
      httpParams = httpParams.append('type', type);
    }
    if (status != undefined && status != '') {
      httpParams = httpParams.append('status', status);
    }
    if (owner != undefined && owner != '') {
      httpParams = httpParams.append('owner', owner);
    }
    if (source != undefined && source != '') {
      httpParams = httpParams.append('source', source);
    }
    if (search != undefined && search.trim() != '') {
      httpParams = httpParams.append('search', search);
    }
    if (environment != undefined && environment != '') {
      httpParams = httpParams.append('environment', environment);
    }
    if (lifecycle != undefined && lifecycle != '') {
      httpParams = httpParams.append('lifecycle', lifecycle);
    }
    if (tier != undefined && tier != '') {
      httpParams = httpParams.append('tier', tier);
    }
    if (system != undefined && system.trim() != '') {
      httpParams = httpParams.append('system', system);
    }
    if (sortField != null && sortOrder != null) {
      httpParams = httpParams.appendAll({
        sort: sortField,
        order: sortOrder == 'ascend' ? 'asc' : 'desc'
      });
    }
    return this.http.get<Message<Page<EntitySummary>>>(entityUri, { params: httpParams });
  }

  public searchEntitiesByIds(entityIds: number[]): Observable<Message<Page<EntitySummary>>> {
    let httpParams = new HttpParams();
    entityIds.forEach(entityId => {
      httpParams = httpParams.append('ids', entityId);
    });
    httpParams = httpParams.appendAll({
      pageIndex: 0,
      pageSize: entityIds.length || 1
    });
    return this.http.get<Message<Page<EntitySummary>>>(entityUri, { params: httpParams });
  }

  public getMonitorBindingCandidates(monitorId: number): Observable<Message<EntityMonitorBindingCandidate[]>> {
    return this.http.get<Message<EntityMonitorBindingCandidate[]>>(`${entityUri}/monitor/${monitorId}/candidates`);
  }
}
