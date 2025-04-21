import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

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
    
    // 发送初始消息
    responseSubject.next({
      content: '正在思考中...',
      isUser: false,
      timestamp: new Date()
    });
    
    // 使用HttpClient发送POST请求
    this.http.post(`${AI_API_URI}/get`, requestBody, {
      responseType: 'text',
      headers: new HttpHeaders({
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json'
      })
    }).pipe(
      tap(response => console.log('收到AI响应，长度:', response.length)),
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
      console.log('收到完整响应');
      
      // 检查是否为SSE格式
      if (response.includes('data:')) {
        // 处理SSE格式的响应
        this.processSSEResponse(response, responseSubject);
      } else {
        // 如果不是SSE格式，直接发送响应
        responseSubject.next({
          content: response,
          isUser: false,
          timestamp: new Date()
        });
        responseSubject.complete();
      }
    });
    
    return responseSubject.asObservable();
  }
  
  /**
   * 处理SSE格式的响应数据
   */
  private processSSEResponse(response: string, subject: Subject<ChatMessage>): void {
    const lines = response.split('\n');
    let fullMessage = '';
    const dataChunks = [];
    
    // 首先收集所有data:行
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('data:')) {
        // 提取data:后面的内容
        const content = trimmedLine.substring(5).trim();
        if (content) {
          dataChunks.push(content);
        }
      }
    }
    
    console.log(`找到${dataChunks.length}个数据块`);
    
    // 如果没有找到有效数据块，发送原始响应
    if (dataChunks.length === 0) {
      subject.next({
        content: response,
        isUser: false,
        timestamp: new Date()
      });
      subject.complete();
      return;
    }
    
    // 模拟流式效果：每隔100毫秒发送一个块
    dataChunks.forEach((chunk, index) => {
      setTimeout(() => {
        // 累积消息
        fullMessage += chunk;
        
        // 发送更新的消息
        subject.next({
          content: fullMessage,
          isUser: false,
          timestamp: new Date()
        });
        
        // 如果是最后一个块，完成流
        if (index === dataChunks.length - 1) {
          subject.complete();
        }
      }, index * 100);
    });
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