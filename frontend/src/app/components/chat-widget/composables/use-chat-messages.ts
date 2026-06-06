import { WritableSignal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownChatService } from '../../../services/markdown-chat.service';
import { ChatResponse } from '../../../services/chat.service';
import { ChatMessage, AttachmentMeta } from '../components/chat-message.component';

export function useChatMessages(
  messages: WritableSignal<ChatMessage[]>,
  isLoading: WritableSignal<boolean>,
  markdownChatService: MarkdownChatService,
  sanitizer: DomSanitizer,
  onSyntaxHighlighting: () => void
) {
  const addUserMessage = (text: string, attachments?: AttachmentMeta[]): void => {
    const userMessage: ChatMessage = {
      from: 'user',
      text,
      timestamp: new Date(),
      ...(attachments && attachments.length > 0 ? { attachments } : {})
    };
    messages.update((arr) => [...arr, userMessage]);
  };

  const handleAssistantResponse = async (response: ChatResponse): Promise<void> => {
    const reply = response?.reply?.trim();
    if (!reply) {
      isLoading.set(false);
      return;
    }

    // Log do modelo usado no DevTools (para debug)
    if (response.modelo) {
      console.log(`🤖 Resposta gerada pelo modelo: ${response.modelo}`);
    }

    const html = await markdownChatService.renderMarkdownToHtml(reply);
    const audioUrl = response.audioBase64
      ? `data:audio/wav;base64,${response.audioBase64}`
      : undefined;
    const pdfUrl = response.pdfBase64
      ? `data:application/pdf;base64,${response.pdfBase64}`
      : undefined;
    const assistantMessage = createAssistantMessage(
      reply,
      html,
      sanitizer,
      audioUrl,
      pdfUrl,
      response.pdfFilename
    );
    messages.update((arr) => [...arr, assistantMessage]);
    isLoading.set(false);
    onSyntaxHighlighting();
  };

  const handleAssistantError = (): void => {
    const errorMessage: ChatMessage = {
      from: 'assistant',
      text: 'Não foi possível falar com a IA agora. Tente novamente em alguns instantes.',
      timestamp: new Date()
    };
    messages.update((arr) => [...arr, errorMessage]);
    isLoading.set(false);
  };

  return {
    addUserMessage,
    handleAssistantResponse,
    handleAssistantError
  };
}

function createAssistantMessage(
  text: string,
  html: string,
  sanitizer: DomSanitizer,
  audioUrl?: string,
  pdfUrl?: string,
  pdfFilename?: string
): ChatMessage {
  return {
    from: 'assistant',
    text,
    html: sanitizer.bypassSecurityTrustHtml(html),
    timestamp: new Date(),
    ...(audioUrl ? { audioUrl } : {}),
    ...(pdfUrl ? { generatedPdf: { filename: pdfFilename || 'curriculo-wesley-personalizado.pdf', url: pdfUrl } } : {})
  };
}

