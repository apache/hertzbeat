import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Collector } from '../pojo/Collector';
import { Message } from '../pojo/Message';
import {CollectorSummary} from "../pojo/CollectorSummary";
import {Page} from "../pojo/Page";

const collector_uri = '/collector';

@Injectable({
  providedIn: 'root'
})
export class CollectorService {
  constructor(private http: HttpClient) {}

  public getCollectors(): Observable<Message<Page<CollectorSummary>>> {
    return this.http.get<Message<Page<CollectorSummary>>>(collector_uri);
  }
}
