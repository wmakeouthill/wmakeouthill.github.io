import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/i18n.pipe';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './chat-header.component.html',
  styleUrls: ['./chat-header.component.css']
})
export class ChatHeaderComponent {
  readonly audioResponseEnabled = input(false);
  readonly historyOpen = input(false);
  readonly onToggleAudioResponse = output<void>();
  readonly onNewChat = output<void>();
  readonly onToggleHistory = output<void>();
  readonly onClose = output<void>();
}
