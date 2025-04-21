import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, Subject, throwError, of } from 'rxjs';
import { catchError, tap, mergeMap } from 'rxjs/operators';

export interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const AI_API_URI = '/ai';

@Injectable({
  providedIn: 'root'
})
export class AiBotService {
  constructor(private http: HttpClient) {
    console.log('AI助手服务已初始化');
  }

  /**
   * 发送消息到AI并获取响应
   */
  sendMessage(message: string): Observable<ChatMessage> {
    console.log('发送消息到AI:', message);
    
    // 创建一个Subject用于处理流式响应
    const responseSubject = new Subject<ChatMessage>();
    
    // 构建请求体
    const requestBody = { text: message };
    
    // 使用HttpClient发送POST请求
    // 注意：这里使用了responseType: 'text'，与其他服务保持一致
    this.http.post(`${AI_API_URI}/get`, requestBody, {
      responseType: 'text',
      headers: new HttpHeaders({
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json'
      })
    }).pipe(
      tap(response => console.log('AI响应成功')),
      catchError(error => {
        console.error('AI请求失败:', error);
        
        // 提供友好的错误信息
        responseSubject.next({
          content: '抱歉，AI服务暂时不可用。请稍后再试。\n错误详情: ' + this.getErrorMessage(error),
          isUser: false,
          timestamp: new Date()
        });
        
        responseSubject.complete();
        return throwError(() => error);
      })
    ).subscribe(response => {
      // 处理成功的响应
      if (response) {
        responseSubject.next({
          content: response,
          isUser: false,
          timestamp: new Date()
        });
      }
      
      responseSubject.complete();
    });
    
    return responseSubject.asObservable();
  }
  
  /**
   * 尝试使用备用方式获取AI响应
   */
  private tryAlternativeMethod(message: string): Observable<string> {
    // 使用标准POST请求作为备用
    const requestBody = { text: message };
    
    return this.http.post(`${AI_API_URI}/get`, requestBody, {
      responseType: 'text',
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      catchError(error => {
        console.error('备用方法也失败:', error);
        return of('抱歉，AI服务暂时不可用。请稍后再试。');
      })
    );
  }
  
  /**
   * 从错误对象中获取可读的错误消息
   */
  private getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      // 客户端错误
      return `客户端错误: ${error.error.message}`;
    } else if (error.status) {
      // 服务器返回的错误
      if (error.status === 401) {
        return '认证失败，请重新登录系统';
      } else if (error.status === 403) {
        return '您没有权限访问此功能';
      } else {
        return `服务器错误: ${error.status} ${error.statusText}`;
      }
    } else {
      // 其他错误
      return error.message || '未知错误';
    }
  }
}