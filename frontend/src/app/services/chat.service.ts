import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  enviarMensagem(mensagem: string): Observable<ChatResponse> {
    const body: ChatRequest = { message: mensagem };
    return this.http.post<ChatResponse>(this.apiUrl, body);
  }
}


