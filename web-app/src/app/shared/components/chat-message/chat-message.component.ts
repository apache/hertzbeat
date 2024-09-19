import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.css'],
})
export class ChatMessageComponent {
  @Input() message!: { sender: string; text: string };
  copied: boolean = false;

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        this.copied = true;
        setTimeout(() => this.copied = false, 2000); // Reset hint after 2 seconds
      },
      (err) => {
        console.error('Failed to copy text: ', err);
      }
    );
  }
}
