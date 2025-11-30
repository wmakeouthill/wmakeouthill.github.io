import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);

  /**
   * URL do backend do chat.
   * Em desenvolvimento, você pode apontar para http://localhost:8080/api/chat.
   * Em produção (GitHub Pages), use a URL pública do backend deployado (ex: Cloud Run/Render).
   */
  private readonly apiUrl = 'http://localhost:8080/api/chat';

  /**
   * Envia uma mensagem para o chat.
   * 
   * @param mensagem texto da mensagem
   * @param sessionId identificador da sessão (enviado no header X-Session-ID)
   */
  enviarMensagem(mensagem: string, sessionId?: string): Observable<ChatResponse> {
    const body: ChatRequest = { message: mensagem };
    
    let headers = new HttpHeaders();
    if (sessionId) {
      headers = headers.set('X-Session-ID', sessionId);
    }
    
    return this.http.post<ChatResponse>(this.apiUrl, body, { headers });
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
}


