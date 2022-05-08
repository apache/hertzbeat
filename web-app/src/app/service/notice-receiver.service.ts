import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import { NoticeReceiver } from '../pojo/NoticeReceiver';

const notice_receiver_uri = '/notice/receiver';
const notice_receivers_uri = '/notice/receivers';
const notice_receiver_send_test_msg_uri = '/notice/receiver/send-test-msg';

@Injectable({
  providedIn: 'root'
})
export class NoticeReceiverService {
  constructor(private http: HttpClient) {}

  public newReceiver(body: NoticeReceiver): Observable<Message<any>> {
    return this.http.post<Message<any>>(notice_receiver_uri, body);
  }

  public editReceiver(body: NoticeReceiver): Observable<Message<any>> {
    return this.http.put<Message<any>>(notice_receiver_uri, body);
  }

  public deleteReceiver(receiverId: number): Observable<Message<any>> {
    return this.http.delete<Message<any>>(`${notice_receiver_uri}/${receiverId}`);
  }

  public getReceivers(): Observable<Message<NoticeReceiver[]>> {
    return this.http.get<Message<NoticeReceiver[]>>(notice_receivers_uri);
  }

  public sendAlertMsgToReceiver(body: NoticeReceiver): Observable<Message<any>> {
    return this.http.post<Message<any>>(notice_receiver_send_test_msg_uri, body);
  }
}
