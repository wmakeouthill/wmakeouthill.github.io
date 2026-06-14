import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { resolveApiUrl } from '../utils/api-url.util';

export type AIModel = 'gemini' | 'gpt';

export interface ChatRequest {
  message: string;
  model?: AIModel;
}

export interface ChatResponse {
  reply: string;
  modelo?: string; // Modelo de IA que gerou a resposta (ex: "gemini-2.5-flash", "gpt-4o-mini")
  audioBase64?: string; // Áudio TTS da resposta (WAV base64), quando solicitado
  pdfBase64?: string; // PDF gerado (ex: currículo) em base64
  pdfFilename?: string; // Nome sugerido do PDF gerado
  curriculoDisponivel?: boolean; // True quando a mensagem pede currículo (gerar sob demanda)
}

export interface ChatEmailResponse {
  success: boolean;
  reply: string;
  subject?: string;
  body?: string;
}

export type CurriculoJobStatus = 'PENDING' | 'DONE' | 'ERROR';

export interface CurriculoJob {
  jobId: string;
  status: CurriculoJobStatus;
  pdfBase64?: string;
  pdfFilename?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = resolveApiUrl('/api/chat');

  /**
   * Envia uma mensagem para o chat.
   *
   * @param mensagem texto da mensagem
   * @param sessionId identificador da sessão (enviado no header X-Session-ID)
   * @param model modelo de IA a usar: 'gemini' (padrão) ou 'gpt'
   */
  enviarMensagem(mensagem: string, sessionId?: string, model: AIModel = 'gemini'): Observable<ChatResponse> {
    const body: ChatRequest = { message: mensagem, model };

    let headers = new HttpHeaders();
    if (sessionId) {
      headers = headers.set('X-Session-ID', sessionId);
    }

    return this.http.post<ChatResponse>(this.apiUrl, body, { headers });
  }

  /**
   * Envia uma mensagem multimodal (texto + anexos: imagem/PDF/áudio/vídeo/documento).
   *
   * @param mensagem texto da mensagem (pode ser vazio se houver anexos)
   * @param files arquivos anexados
   * @param sessionId identificador da sessão
   * @param model modelo de IA a usar
   * @param audioResponse se true, pede também a resposta em áudio (TTS)
   */
  enviarMultimodal(
    mensagem: string,
    files: File[],
    sessionId?: string,
    model: AIModel = 'gemini',
    audioResponse = false
  ): Observable<ChatResponse> {
    const formData = new FormData();
    formData.append('message', mensagem ?? '');
    formData.append('model', model);
    formData.append('audioResponse', String(audioResponse));
    for (const file of files) {
      formData.append('files', file, file.name);
    }

    let headers = new HttpHeaders();
    if (sessionId) {
      headers = headers.set('X-Session-ID', sessionId);
    }

    return this.http.post<ChatResponse>(`${this.apiUrl}/multimodal`, formData, { headers });
  }

  /**
   * Limpa o histórico de mensagens no backend para a sessão especificada.
   *
   * @param sessionId identificador da sessão
   */
  limparHistorico(sessionId?: string): Observable<void> {
    let headers = new HttpHeaders();
    if (sessionId) {
      headers = headers.set('X-Session-ID', sessionId);
    }

    return this.http.post<void>(`${this.apiUrl}/clear`, {}, { headers });
  }

  enviarEmailChat(mensagem: string, model: AIModel = 'gemini'): Observable<ChatEmailResponse> {
    return this.http.post<ChatEmailResponse>(`${this.apiUrl}/email`, { message: mensagem, model });
  }

  /**
   * Inicia a geração assíncrona do currículo (PDF). A geração pode ultrapassar o
   * teto de ~60s do proxy/Vercel, então não bloqueamos a requisição: o backend
   * roda em background e devolve um jobId; o resultado é obtido por polling em
   * {@link consultarCurriculo}.
   *
   * @param message vaga / pedido do usuário
   * @param reply resposta conversacional já gerada (opcional; vazia no comando /curriculo)
   * @param sessionId identificador da sessão (header X-Session-ID)
   */
  iniciarCurriculo(message: string, reply = '', sessionId?: string): Observable<CurriculoJob> {
    let headers = new HttpHeaders();
    if (sessionId) {
      headers = headers.set('X-Session-ID', sessionId);
    }

    return this.http.post<CurriculoJob>(`${this.apiUrl}/curriculo`, { message, reply }, { headers });
  }

  /**
   * Consulta o estado da geração do currículo (polling). Cada chamada é rápida e
   * cabe folgada no teto do proxy, independente de quanto o Vertex demore.
   */
  consultarCurriculo(jobId: string, sessionId?: string): Observable<CurriculoJob> {
    let headers = new HttpHeaders();
    if (sessionId) {
      headers = headers.set('X-Session-ID', sessionId);
    }

    return this.http.get<CurriculoJob>(`${this.apiUrl}/curriculo/${encodeURIComponent(jobId)}`, { headers });
  }
}


