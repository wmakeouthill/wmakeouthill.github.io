import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-floating-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-floating-button.component.html',
  styleUrls: ['./chat-floating-button.component.css']
})
export class ChatFloatingButtonComponent {
  readonly onClick = output<void>();
}

