import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtml } from '@angular/platform-browser';

export interface ChatMessage {
  from: 'user' | 'assistant';
  text: string;
  html?: SafeHtml;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.css']
})
export class ChatMessageComponent {
  message = input.required<ChatMessage>();
}

