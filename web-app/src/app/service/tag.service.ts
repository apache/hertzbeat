import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';
import { Tag } from '../pojo/Tag';

const tag_uri = '/tag';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  constructor(private http: HttpClient) {}

  public loadTags(
    search: string | undefined,
    type: number | undefined,
    pageIndex: number,
    pageSize: number
  ): Observable<Message<Page<Tag>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // 注意HttpParams是不可变对象 需要保存set后返回的对象为最新对象
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (type != undefined) {
      httpParams = httpParams.append('type', type);
    }
    if (search != undefined && search != '' && search.trim() != '') {
      httpParams = httpParams.append('search', search.trim());
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<Tag>>>(tag_uri, options);
  }

  public newTags(body: Tag[]): Observable<Message<any>> {
    return this.http.post<Message<any>>(tag_uri, body);
  }

  public newTag(body: Tag): Observable<Message<any>> {
    const tags = [];
    tags.push(body);
    return this.http.post<Message<any>>(tag_uri, tags);
  }

  public editTag(body: Tag): Observable<Message<any>> {
    return this.http.put<Message<any>>(tag_uri, body);
  }

  public deleteTags(tagIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    tagIds.forEach(tagId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', tagId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(tag_uri, options);
  }
}
