import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MemoryStorageService {
  data: Record<string, any>;
  constructor() {
    this.data = {};
  }

  public putData(key: string, value: any) {
    this.data[key] = value;
  }

  public getData(key: string): any | undefined {
    return this.data[key];
  }

  public clear() {
    this.data = {};
  }
}
