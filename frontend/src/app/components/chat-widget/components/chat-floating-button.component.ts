import { ChangeDetectionStrategy, Component, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/i18n.pipe';

@Component({
  selector: 'app-chat-floating-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './chat-floating-button.component.html',
  styleUrls: ['./chat-floating-button.component.css']
})
export class ChatFloatingButtonComponent {
  readonly onClick = output<void>();
  readonly isOpen = input<boolean>(false);
}

