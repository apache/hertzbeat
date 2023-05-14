import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import { NoticeSender } from '../pojo/NoticeSender';

const notice_sender_save_uri = '/config/sender';
const notice_sender_get_uri = '/config/senders';
const notice_sender_delete_uri = '/config/sender';

@Injectable({
  providedIn: 'root'
})
export class NoticeSenderService {
  constructor(private http: HttpClient) {}

  public newSender(body: NoticeSender): Observable<Message<any>> {
    return this.http.post<Message<any>>(notice_sender_save_uri, body);
  }

  public editSender(body: NoticeSender): Observable<Message<any>> {
    return this.http.post<Message<any>>(notice_sender_save_uri, body);
  }

  public deleteSender(senderId: number): Observable<Message<any>> {
    return this.http.delete<Message<any>>(`${notice_sender_delete_uri}/${senderId}`);
  }

  public getSenders(): Observable<Message<NoticeSender[]>> {
    return this.http.get<Message<NoticeSender[]>>(notice_sender_get_uri);
  }
}
