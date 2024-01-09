import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';

const general_config_uri = '/config';

@Injectable({
  providedIn: 'root'
})
export class GeneralConfigService {
  constructor(private http: HttpClient) {}

  public saveGeneralConfig(body: any, type: string): Observable<Message<any>> {
    return this.http.post<Message<any>>(`${general_config_uri}/${type}`, body);
  }

  public getGeneralConfig(type: string): Observable<Message<any>> {
    return this.http.get<Message<any>>(`${general_config_uri}/${type}`);
  }
}
