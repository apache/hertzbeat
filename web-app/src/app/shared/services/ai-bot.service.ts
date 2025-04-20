import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AiBotService {
  constructor() {
    console.log('AI助手服务已初始化');
  }

  /**
   * 发送消息到AI并获取响应
   * 注意：这是一个模拟实现，实际应用中应该连接到后端API
   */
  sendMessage(message: string): Observable<ChatMessage> {
    console.log('发送消息到AI:', message);
    
    // 模拟API响应延迟
    return of({
      content: `收到你的问题："${message}"。我是AI助手，很高兴为您服务！`, 
      isUser: false,
      timestamp: new Date()
    }).pipe(
      delay(1000),
      tap(response => console.log('AI响应:', response.content))
    );
  }
} 