import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import { NoticeRule } from '../pojo/NoticeRule';

const notice_rule_uri = '/notice/rule';
const notice_rules_uri = '/notice/rules';

@Injectable({
  providedIn: 'root'
})
export class NoticeRuleService {
  constructor(private http: HttpClient) {}

  public newNoticeRule(body: NoticeRule): Observable<Message<any>> {
    return this.http.post<Message<any>>(notice_rule_uri, body);
  }

  public editNoticeRule(body: NoticeRule): Observable<Message<any>> {
    return this.http.put<Message<any>>(notice_rule_uri, body);
  }

  public deleteNoticeRule(ruleId: number): Observable<Message<any>> {
    return this.http.delete<Message<any>>(`${notice_rule_uri}/${ruleId}`);
  }

  public getNoticeRules(): Observable<Message<NoticeRule[]>> {
    return this.http.get<Message<NoticeRule[]>>(notice_rules_uri);
  }
}
