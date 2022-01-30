import { Injectable } from '@angular/core';

const AuthorizationConst = 'Authorization';
const RefreshTokenConst = 'refresh-token';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  constructor() {}

  public putData(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  public getData(key: string): string | null {
    const data = localStorage.getItem(key);
    return data === null ? null : data;
  }

  public getAuthorizationToken(): string | null {
    return this.getData(AuthorizationConst);
  }

  public getRefreshToken(): string | null {
    return this.getData(RefreshTokenConst);
  }

  public storageRefreshToken(token: string) {
    return this.putData(RefreshTokenConst, token);
  }

  public storageAuthorizationToken(token: string) {
    return this.putData(AuthorizationConst, token);
  }

  public hasAuthorizationToken() {
    return localStorage.getItem(AuthorizationConst) != null;
  }

  public clear() {
    localStorage.clear();
  }
}
