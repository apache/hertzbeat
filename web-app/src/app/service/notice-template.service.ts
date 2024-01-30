import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import { NoticeTemplate } from '../pojo/NoticeTemplate';

const notice_template_uri = '/notice/template';
const notice_templates_uri = '/notice/templates';
const default_notice_templates_uri = '/notice/default_templates';
@Injectable({
  providedIn: 'root'
})
export class NoticeTemplateService {
  constructor(private http: HttpClient) {}

  public newNoticeTemplate(body: NoticeTemplate): Observable<Message<any>> {
    return this.http.post<Message<any>>(notice_template_uri, body);
  }

  public editNoticeTemplate(body: NoticeTemplate): Observable<Message<any>> {
    return this.http.put<Message<any>>(notice_template_uri, body);
  }

  public deleteNoticeTemplate(templateId: number): Observable<Message<any>> {
    return this.http.delete<Message<any>>(`${notice_template_uri}/${templateId}`);
  }

  public getNoticeTemplates(): Observable<Message<NoticeTemplate[]>> {
    return this.http.get<Message<NoticeTemplate[]>>(notice_templates_uri);
  }
  public getDefaultNoticeTemplates(): Observable<Message<NoticeTemplate[]>> {
    return this.http.get<Message<NoticeTemplate[]>>(default_notice_templates_uri);
  }
}
