import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';

const account_auth_refresh_uri = '/account/auth/refresh';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  public refreshToken(refreshToken: string): Observable<Message<any>> {
    return this.http.get<Message<any>>(`${account_auth_refresh_uri}/${refreshToken}`);
  }
}
