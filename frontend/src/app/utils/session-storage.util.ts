/**
 * Utilitário para gerenciar Session ID e persistência de mensagens no sessionStorage.
 * 
 * sessionStorage vs localStorage:
 * - sessionStorage: limpa ao fechar aba/navegador (mais econômico)
 * - localStorage: mantém entre sessões (menos econômico)
 * 
 * Para economia de tokens, preferimos sessionStorage.
 */

const STORAGE_KEY_SESSION_ID = 'chat_session_id';
const STORAGE_KEY_MESSAGES = 'chat_messages';

/**
 * Obtém ou gera um Session ID único para esta sessão do navegador.
 * Session ID é mantido no sessionStorage durante a sessão.
 */
export function obterOuGerarSessionId(): string {
  const sessionId = sessionStorage.getItem(STORAGE_KEY_SESSION_ID);
  
  if (sessionId) {
    return sessionId;
  }
  
  // Gera novo Session ID único
  const novoSessionId = gerarSessionId();
  sessionStorage.setItem(STORAGE_KEY_SESSION_ID, novoSessionId);
  
  return novoSessionId;
}

/**
 * Gera um Session ID único usando timestamp e random.
 */
function gerarSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `session-${timestamp}-${random}`;
}

/**
 * Salva mensagens do chat no sessionStorage.
 */
export function salvarMensagens(messages: unknown[]): void {
  try {
    const json = JSON.stringify(messages);
    sessionStorage.setItem(STORAGE_KEY_MESSAGES, json);
  } catch (error) {
    console.warn('Erro ao salvar mensagens no sessionStorage:', error);
  }
}

/**
 * Carrega mensagens do chat do sessionStorage.
 */
export function carregarMensagens<T>(): T[] {
  try {
    const json = sessionStorage.getItem(STORAGE_KEY_MESSAGES);
    if (!json) {
      return [];
    }
    return JSON.parse(json) as T[];
  } catch (error) {
    console.warn('Erro ao carregar mensagens do sessionStorage:', error);
    return [];
  }
}

/**
 * Limpa mensagens e session ID do sessionStorage.
 */
export function limparSessionStorage(): void {
  sessionStorage.removeItem(STORAGE_KEY_SESSION_ID);
  sessionStorage.removeItem(STORAGE_KEY_MESSAGES);
}

/**
 * Obtém o Session ID atual (sem gerar novo se não existir).
 */
export function obterSessionId(): string | null {
  return sessionStorage.getItem(STORAGE_KEY_SESSION_ID);
}

