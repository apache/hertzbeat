import { Injectable } from '@angular/core';

const Authorization = 'Authorization';
const refreshToken = 'refresh-token';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() { }

  public putData(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  public getData(key: string): string | null {
    const data = localStorage.getItem(key);
    return data === null ? null : data;
  }

  public getAuthorizationToken(): string | null {
    return this.getData(Authorization);
  }

  public getRefreshToken(): string | null {
    return this.getData(refreshToken);
  }

  public storageRefreshToken(token: string) {
    return this.putData(refreshToken, token);
  }

  public storageAuthorizationToken(token: string) {
    return this.putData(Authorization, token);
  }

  public hasAuthorizationToken() {
    return localStorage.getItem(Authorization) === null;
  }

  public clear() {
    localStorage.clear();
  }

}
