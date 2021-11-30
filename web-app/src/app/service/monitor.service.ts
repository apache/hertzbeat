import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {Message} from "../pojo/Message";

const monitor_uri = "/monitor";

@Injectable({
  providedIn: 'root'
})
export class MonitorService {

  constructor(private http : HttpClient) { }

  public newMonitor(body: any) : Observable<Message> {
    return this.http.post<Message>(monitor_uri, body);
  }

}
