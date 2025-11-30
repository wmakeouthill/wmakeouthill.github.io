# 🔄 Comportamento do Histórico ao Atualizar a Página

## 📋 Situação Atual

### **Quando o Usuário Atualiza a Página (F5)**

#### **1. Frontend (Angular)**

```typescript
messages = signal<ChatMessage[]>([]);  // ← Reinicializa para vazio!
```

**O que acontece**:
- ❌ **TODAS as mensagens são PERDIDAS**
- Signal é reinicializado para array vazio
- NÃO há persistência (sem localStorage/sessionStorage)
- Usuário vê chat vazio

#### **2. Backend (Java)**

```java
private final List<MensagemChat> historico = ...;  // ← Mantém em memória
```

**O que acontece**:
- ✅ Backend **MANTÉM** histórico em memória
- ❌ **MAS** está compartilhado entre todos os usuários
- Histórico só é perdido se servidor reiniciar

---

## ⚠️ Problemas Identificados

### **Problema 1: Frontend Perde Mensagens**

**Ao atualizar a página**:
```
Antes: [Mensagem 1, Mensagem 2, Mensagem 3]
Depois: []  ← VAZIO!
```

**Resultado**: Usuário não vê histórico anterior

### **Problema 2: Backend Mantém Mas Compartilhado**

**Situação atual**:
```
Usuário A atualiza → Backend mantém histórico
Usuário B usa chat → Vê histórico MISTURADO com Usuário A! 😱
```

**Resultado**: Histórico compartilhado incorretamente

### **Problema 3: Sem Identificação de Sessão**

- Backend não sabe qual histórico pertence a qual usuário
- Todos compartilham o mesmo histórico
- Não há como recuperar histórico após atualização

---

## 🎯 Respostas Diretas

### **Pergunta 1: "O histórico é zerado ao atualizar?"**

**Frontend**: ✅ **SIM** - Tudo é perdido  
**Backend**: ❌ **NÃO** - Mantém em memória (mas compartilhado incorretamente)

### **Pergunta 2: "Backend mantém depois de finalizar interações?"**

✅ **SIM** - Backend mantém em memória até:
- Servidor reiniciar
- Aplicação ser desligada
- Memória ser limpa

⚠️ **MAS** está compartilhado entre todos (bug!)

---

## 📊 Fluxo Atual Completo

### **Cenário: Usuário Conversa e Atualiza Página**

```
1. Usuário envia "Olá"
   Frontend: messages = ["Olá"]
   Backend:  historico = ["Olá"]

2. IA responde "Olá! Como posso ajudar?"
   Frontend: messages = ["Olá", "Olá! Como posso ajudar?"]
   Backend:  historico = ["Olá", "Olá! Como posso ajudar?"]

3. Usuário atualiza página (F5)
   Frontend: messages = []  ← PERDIDO!
   Backend:  historico = ["Olá", "Olá! Como posso ajudar?"]  ← MANTÉM (mas compartilhado)

4. Usuário envia nova mensagem "Quais seus projetos?"
   Frontend: messages = ["Quais seus projetos?"]  ← Só nova mensagem
   Backend:  historico = ["Olá", "Olá! Como posso ajudar?", "Quais seus projetos?"]
   
   ⚠️ Backend envia contexto completo para IA:
   - "Olá"
   - "Olá! Como posso ajudar?"
   - "Quais seus projetos?"
   
   ✅ IA ainda tem contexto (por isso funciona)
   ❌ MAS frontend não mostra mensagens antigas
```

---

## 🔧 O Que Precisa Ser Corrigido

### **1. Separar Histórico Por Sessão** ✅ Urgente

```java
// Antes (ERRADO):
private final List<MensagemChat> historico = ...;  // Compartilhado

// Depois (CORRETO):
private final Map<String, List<MensagemChat>> historicoPorSessao = ...;
// Key = Session ID
```

### **2. Persistir Mensagens no Frontend** (Opcional, mas recomendado)

```typescript
// Salvar no sessionStorage (perde ao fechar navegador)
// OU localStorage (mantém entre sessões)

messages = signal<ChatMessage[]>(
  this.loadMessagesFromStorage()  // ← Recuperar ao inicializar
);
```

### **3. Recuperar Histórico do Backend** (Opcional)

Se implementar sessão, pode ter endpoint para recuperar histórico:
```
GET /api/chat/history?sessionId=xxx
```

---

## ✅ Recomendações

### **Prioridade 1: Corrigir Histórico Compartilhado** 🔴 Urgente

**Por quê**: Bug crítico - usuários vêm mensagens de outros

**Solução**: Implementar histórico por sessão

### **Prioridade 2: Persistir no Frontend** 🟡 Importante

**Por quê**: Melhor experiência - usuário vê histórico ao atualizar

**Solução**: Usar sessionStorage ou localStorage

### **Prioridade 3: Recuperar do Backend** 🟢 Opcional

**Por quê**: Histórico completo mesmo em diferentes dispositivos

**Solução**: Endpoint para buscar histórico da sessão

---

## 📝 Resumo Executivo

| Aspecto | Situação Atual | Deveria Ser |
|---------|----------------|-------------|
| **Frontend ao atualizar** | ❌ Perde tudo | ✅ Mantém (sessionStorage) |
| **Backend ao atualizar** | ⚠️ Mantém mas compartilhado | ✅ Mantém por sessão |
| **Identificação sessão** | ❌ Não existe | ✅ Session ID |
| **Isolamento usuários** | ❌ Todos compartilham | ✅ Histórico isolado |

---

**Última Atualização**: 2024-12-19  
**Status**: ⚠️ Problema identificado - Precisa correção

