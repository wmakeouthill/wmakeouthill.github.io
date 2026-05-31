/**
 * Utilitário para gerenciar Session ID e persistência de conversas do chat.
 *
 * Usa localStorage para manter o histórico entre sessões do navegador (não some
 * ao fechar a aba). Suporta múltiplas conversas: uma conversa "atual" e um
 * histórico de conversas anteriores que o usuário pode reabrir.
 */

const STORAGE_KEY_CONVERSATIONS = 'chat_conversations';
const STORAGE_KEY_CURRENT_ID = 'chat_current_id';

// Chaves legadas (modelo de conversa única) — migradas no primeiro acesso.
const LEGACY_KEY_SESSION_ID = 'chat_session_id';
const LEGACY_KEY_MESSAGES = 'chat_messages';

export interface ConversaSalva {
  id: string;
  sessionId: string;
  title: string;
  messages: unknown[];
  updatedAt: string;
}

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

function gerarId(prefixo: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefixo}-${timestamp}-${random}`;
}

function lerConversas(): ConversaSalva[] {
  const store = storage();
  if (!store) {
    return [];
  }
  try {
    const json = store.getItem(STORAGE_KEY_CONVERSATIONS);
    if (json) {
      const parsed = JSON.parse(json) as ConversaSalva[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.warn('Erro ao carregar conversas do localStorage:', error);
  }
  // Tenta migrar o modelo legado de conversa única.
  return migrarLegado(store);
}

function migrarLegado(store: Storage): ConversaSalva[] {
  try {
    const json = store.getItem(LEGACY_KEY_MESSAGES);
    const sessionId = store.getItem(LEGACY_KEY_SESSION_ID);
    if (!json) {
      return [];
    }
    const messages = JSON.parse(json) as unknown[];
    if (!Array.isArray(messages) || messages.length === 0) {
      return [];
    }
    const conversa: ConversaSalva = {
      id: gerarId('conv'),
      sessionId: sessionId ?? gerarId('session'),
      title: derivarTitulo(messages),
      messages,
      updatedAt: new Date().toISOString()
    };
    persistir([conversa], conversa.id);
    store.removeItem(LEGACY_KEY_MESSAGES);
    store.removeItem(LEGACY_KEY_SESSION_ID);
    return [conversa];
  } catch {
    return [];
  }
}

function persistir(conversas: ConversaSalva[], currentId: string | null): void {
  const store = storage();
  if (!store) {
    return;
  }
  try {
    store.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversas));
    if (currentId) {
      store.setItem(STORAGE_KEY_CURRENT_ID, currentId);
    } else {
      store.removeItem(STORAGE_KEY_CURRENT_ID);
    }
  } catch (error) {
    console.warn('Erro ao salvar conversas no localStorage:', error);
  }
}

/**
 * Deriva um título curto a partir da primeira mensagem do usuário.
 */
function derivarTitulo(messages: unknown[]): string {
  const primeiraDoUsuario = messages.find(
    (m): m is { from: string; text?: string } =>
      typeof m === 'object' && m !== null && (m as { from?: string }).from === 'user'
  );
  const texto = primeiraDoUsuario?.text?.trim();
  if (texto) {
    return texto.length > 40 ? `${texto.slice(0, 40)}…` : texto;
  }
  return 'Nova conversa';
}

/** Indica se a conversa tem ao menos uma mensagem do usuário (vale histórico). */
function temMensagemDoUsuario(messages: unknown[]): boolean {
  return messages.some(
    (m) => typeof m === 'object' && m !== null && (m as { from?: string }).from === 'user'
  );
}

/**
 * Lista as conversas que valem histórico (têm mensagem do usuário),
 * ordenadas da mais recente para a mais antiga.
 */
export function listarConversas(): ConversaSalva[] {
  return lerConversas()
    .filter((c) => temMensagemDoUsuario(c.messages))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Obtém a conversa atual (a que está aberta), ou null se não houver.
 */
export function obterConversaAtual(): ConversaSalva | null {
  const store = storage();
  if (!store) {
    return null;
  }
  const currentId = store.getItem(STORAGE_KEY_CURRENT_ID);
  const conversas = lerConversas();
  if (currentId) {
    const atual = conversas.find((c) => c.id === currentId);
    if (atual) {
      return atual;
    }
  }
  return null;
}

/**
 * Obtém (ou gera) o Session ID da conversa atual, criando uma conversa vazia
 * quando ainda não existe nenhuma.
 */
export function obterOuGerarSessionId(): string {
  const atual = obterConversaAtual();
  if (atual) {
    return atual.sessionId;
  }
  const nova = iniciarNovaConversa();
  return nova.sessionId;
}

/**
 * Salva (upsert) as mensagens na conversa atual. Cria a conversa caso não exista.
 */
export function salvarMensagens(messages: unknown[]): void {
  const store = storage();
  if (!store) {
    return;
  }
  const conversas = lerConversas();
  let currentId = store.getItem(STORAGE_KEY_CURRENT_ID);

  const indice = currentId ? conversas.findIndex((c) => c.id === currentId) : -1;
  if (indice >= 0) {
    conversas[indice] = {
      ...conversas[indice],
      title: derivarTitulo(messages),
      messages,
      updatedAt: new Date().toISOString()
    };
  } else {
    const nova: ConversaSalva = {
      id: gerarId('conv'),
      sessionId: gerarId('session'),
      title: derivarTitulo(messages),
      messages,
      updatedAt: new Date().toISOString()
    };
    conversas.push(nova);
    currentId = nova.id;
  }
  persistir(conversas, currentId);
}

/**
 * Carrega as mensagens da conversa atual.
 */
export function carregarMensagens<T>(): T[] {
  const atual = obterConversaAtual();
  return (atual?.messages as T[]) ?? [];
}

/**
 * Obtém o Session ID atual (sem gerar novo se não existir).
 */
export function obterSessionId(): string | null {
  return obterConversaAtual()?.sessionId ?? null;
}

/**
 * Inicia uma nova conversa: cria um registro vazio e o define como atual.
 * Retorna a conversa criada (com novo id e sessionId).
 */
export function iniciarNovaConversa(): ConversaSalva {
  const conversas = lerConversas();
  const nova: ConversaSalva = {
    id: gerarId('conv'),
    sessionId: gerarId('session'),
    title: 'Nova conversa',
    messages: [],
    updatedAt: new Date().toISOString()
  };
  // Remove conversas anteriores que ficaram sem mensagem do usuário (vazias).
  const limpas = conversas.filter((c) => temMensagemDoUsuario(c.messages));
  limpas.push(nova);
  persistir(limpas, nova.id);
  return nova;
}

/**
 * Seleciona uma conversa existente do histórico como conversa atual.
 * Retorna a conversa, ou null se não encontrada.
 */
export function selecionarConversa(id: string): ConversaSalva | null {
  const conversas = lerConversas();
  const alvo = conversas.find((c) => c.id === id);
  if (!alvo) {
    return null;
  }
  // Descarta conversas vazias ao trocar de conversa.
  const limpas = conversas.filter((c) => c.id === id || temMensagemDoUsuario(c.messages));
  persistir(limpas, id);
  return alvo;
}

/**
 * Remove uma conversa do histórico. Se for a atual, limpa a seleção.
 */
export function removerConversa(id: string): void {
  const store = storage();
  if (!store) {
    return;
  }
  const conversas = lerConversas().filter((c) => c.id !== id);
  const currentId = store.getItem(STORAGE_KEY_CURRENT_ID);
  persistir(conversas, currentId === id ? null : currentId);
}

/**
 * Limpa toda a conversa atual e o histórico (reset total).
 */
export function limparChat(): void {
  const store = storage();
  store?.removeItem(STORAGE_KEY_CONVERSATIONS);
  store?.removeItem(STORAGE_KEY_CURRENT_ID);
}
