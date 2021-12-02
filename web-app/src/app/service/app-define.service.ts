import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Message} from "../pojo/Message";
import {Observable} from "rxjs";
import {ParamDefine} from "../pojo/ParamDefine";


@Injectable({
  providedIn: 'root'
})
export class AppDefineService {

  constructor(private http : HttpClient) { }

  public getAppParamsDefine(app: string | undefined | null) : Observable<Message<ParamDefine[]>> {
    if (app === null || app === undefined) {
      console.log("getAppParamsDefine app can not null");
    }
    const paramDefineUri = `/apps/${app}/params`;
    return this.http.get<Message<ParamDefine[]>>(paramDefineUri);
  }

}
