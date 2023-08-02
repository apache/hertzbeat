import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Collector } from '../pojo/Collector';
import { Message } from '../pojo/Message';

const collector_uri = '/collector';

@Injectable({
  providedIn: 'root'
})
export class CollectorService {
  constructor(private http: HttpClient) {}

  public getCollectors(): Observable<Message<Collector[]>> {
    return this.http.get<Message<Collector[]>>(collector_uri);
  }
}
