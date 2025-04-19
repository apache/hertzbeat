import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent {
  isPopupVisible = false;
  userInput = '';
  messages: { sender: string; text: string }[] = [];

  constructor(private http: HttpClient) { }

  togglePopup() {
    this.isPopupVisible = !this.isPopupVisible;
  }

  sendMessage() {
    if (this.userInput.trim()) {
      // Add user's message to the chat window
      this.messages.push({ sender: 'You', text: this.userInput });

      // Send the message to the AI backend
      this.http.post('/api/ai', { text: this.userInput }).subscribe(
        (response: any) => {
          // Add AI's response to the chat window
          this.messages.push({ sender: 'AI', text: "sample answer" });
        },
        (error) => {
          // Handle error response
          this.messages.push({ sender: 'AI', text: 'Error communicating with AI' });
          console.error('Error communicating with AI:', error);
        }
      );

      // Clear the input field
      this.userInput = '';
    }
  }

  resetChat() {
    this.messages = [];
  }
}
