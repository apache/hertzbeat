import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import { StatusPageComponentStatus } from '../pojo/StatusPageComponentStatus';
import { StatusPageIncident } from '../pojo/StatusPageIncident';
import { StatusPageOrg } from '../pojo/StatusPageOrg';

const status_page_org_public_uri = '/status/page/public/org';

const status_page_component_public_uri = '/status/page/public/component';

const status_page_incident_public_uri = '/status/page/public/incident';

@Injectable({
  providedIn: 'root'
})
export class StatusPagePublicService {
  constructor(private http: HttpClient) {}

  public getStatusPageOrg(): Observable<Message<StatusPageOrg>> {
    return this.http.get<Message<StatusPageOrg>>(status_page_org_public_uri);
  }

  public getStatusPageComponents(): Observable<Message<StatusPageComponentStatus[]>> {
    return this.http.get<Message<StatusPageComponentStatus[]>>(status_page_component_public_uri);
  }

  public getStatusPageComponent(componentId: number): Observable<Message<StatusPageComponentStatus>> {
    return this.http.get<Message<StatusPageComponentStatus>>(`${status_page_component_public_uri}/${componentId}`);
  }

  public getStatusPageIncidents(): Observable<Message<StatusPageIncident[]>> {
    return this.http.get<Message<StatusPageIncident[]>>(status_page_incident_public_uri);
  }
}
