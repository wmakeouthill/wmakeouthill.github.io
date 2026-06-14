import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtml } from '@angular/platform-browser';

export type AttachmentKind = 'image' | 'pdf' | 'audio' | 'video' | 'doc';

export interface AttachmentMeta {
  name: string;
  mime: string;
  kind: AttachmentKind;
  /** Preview/dataUrl em memória (não persistido no localStorage). */
  previewUrl?: string;
}

export interface ChatMessage {
  from: 'user' | 'assistant';
  text: string;
  html?: SafeHtml;
  timestamp: Date;
  /** Anexos enviados pelo usuário (metadados para exibição). */
  attachments?: AttachmentMeta[];
  /** Áudio TTS da resposta do assistente (object URL ou data URL). */
  audioUrl?: string;
  generatedPdf?: {
    filename: string;
    url: string;
  };
  /**
   * Quando presente, a mensagem oferece a geração do currículo sob demanda:
   * exibe um botão que dispara POST /api/chat/curriculo com estes dados.
   */
  curriculoRequest?: {
    message: string;
    reply: string;
  };
  /** True enquanto o currículo está sendo gerado (mostra estado de carregando). */
  curriculoLoading?: boolean;
  /** Mensagem de erro caso a geração do currículo falhe. */
  curriculoError?: string;
}

export function classificarAnexo(mime: string, name: string): AttachmentKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'doc';
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
  /** Emitido quando o usuário pede para gerar o currículo a partir desta mensagem. */
  generateCurriculo = output<ChatMessage>();

  onGerarCurriculo(): void {
    this.generateCurriculo.emit(this.message());
  }
}

