import { Component, OnInit } from '@angular/core';
import { AiBotService, ChatMessage } from '../../services/ai-bot.service';

@Component({
  selector: 'app-ai-bot',
  templateUrl: './ai-bot.component.html',
  styleUrls: ['./ai-bot.component.less']
})
export class AiBotComponent implements OnInit {
  isOpen = false;
  messages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;

  constructor(private aiBotService: AiBotService) {}

  ngOnInit(): void {
    // 添加欢迎消息
    this.messages.push({
      content: '你好！我是AI助手，有什么可以帮助你的吗？',
      isUser: false,
      timestamp: new Date()
    });
    
    // 记录组件已加载，用于调试
    console.log('AI助手组件已加载');
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    console.log('切换聊天窗口状态:', this.isOpen ? '打开' : '关闭');
  }

  sendMessage(): void {
    if (!this.currentMessage.trim()) return;

    // 添加用户消息
    this.messages.push({
      content: this.currentMessage,
      isUser: true,
      timestamp: new Date()
    });

    const userMessage = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;

    // 调用服务获取AI响应
    this.aiBotService.sendMessage(userMessage).subscribe(response => {
      this.messages.push(response);
      this.isLoading = false;
    });
  }
} 