/**
 * Utilitário para gerenciar Session ID e persistência de mensagens do chat.
 *
 * Usa localStorage para manter o histórico de conversa entre sessões do
 * navegador (não some ao fechar a aba), conforme requisito do produto.
 */

const STORAGE_KEY_SESSION_ID = 'chat_session_id';
const STORAGE_KEY_MESSAGES = 'chat_messages';

/**
 * Acesso seguro ao localStorage (SSR / modo privado podem lançar).
 */
function storage(): Storage | null {
  try {
    const g = globalThis as { localStorage?: Storage };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Obtém ou gera um Session ID único, persistido no localStorage.
 */
export function obterOuGerarSessionId(): string {
  const store = storage();
  const sessionId = store?.getItem(STORAGE_KEY_SESSION_ID);

  if (sessionId) {
    return sessionId;
  }

  const novoSessionId = gerarSessionId();
  store?.setItem(STORAGE_KEY_SESSION_ID, novoSessionId);

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
 * Salva mensagens do chat no localStorage.
 */
export function salvarMensagens(messages: unknown[]): void {
  try {
    const json = JSON.stringify(messages);
    storage()?.setItem(STORAGE_KEY_MESSAGES, json);
  } catch (error) {
    console.warn('Erro ao salvar mensagens no localStorage:', error);
  }
}

/**
 * Carrega mensagens do chat do localStorage.
 */
export function carregarMensagens<T>(): T[] {
  try {
    const json = storage()?.getItem(STORAGE_KEY_MESSAGES);
    if (!json) {
      return [];
    }
    return JSON.parse(json) as T[];
  } catch (error) {
    console.warn('Erro ao carregar mensagens do localStorage:', error);
    return [];
  }
}

/**
 * Obtém o Session ID atual (sem gerar novo se não existir).
 */
export function obterSessionId(): string | null {
  return storage()?.getItem(STORAGE_KEY_SESSION_ID) ?? null;
}

/**
 * Limpa mensagens e session ID do localStorage (inicia nova conversa).
 */
export function limparChat(): void {
  const store = storage();
  store?.removeItem(STORAGE_KEY_SESSION_ID);
  store?.removeItem(STORAGE_KEY_MESSAGES);
}
