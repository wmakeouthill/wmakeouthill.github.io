# ✅ Solução: Histórico Por Sessão

## 🎯 Objetivo

Separar o histórico de mensagens por sessão/navegador, garantindo que cada usuário tenha seu próprio histórico isolado.

---

## 🔧 Implementação

### **Opções de Identificação de Sessão**

1. **Session ID no Header** (Recomendado)
   - Frontend envia `X-Session-ID` no header
   - Backend identifica sessão pelo header

2. **Session ID no Body**
   - Adicionar `sessionId` opcional no `ChatRequest`
   - Frontend gera e mantém sessionId

3. **Cookie/Session HTTP**
   - Spring Session gerenciado
   - Mais complexo, mas automático

**Recomendação**: Opção 1 (Header) - Simples e eficiente.

---

## 📝 Plano de Implementação

### **Etapa 1: Modificar ChatRequest (Opcional)**
- Adicionar campo `sessionId` opcional

### **Etapa 2: Modificar GerenciarHistoricoChatAdapter**
- Usar `Map<String, List<MensagemChat>>` ao invés de `List`
- Chave: Session ID
- Limpeza automática de sessões antigas

### **Etapa 3: Modificar ChatController**
- Extrair Session ID do header
- Passar para o UseCase

### **Etapa 4: Modificar ChatUseCase**
- Passar sessionId para o adapter

### **Etapa 5: Frontend (Opcional)**
- Gerar e manter sessionId
- Enviar no header

---

## ⚠️ Considerações

### **Limpeza de Memória**
- Sessões antigas devem ser removidas
- Implementar TTL (Time To Live)
- Limpar sessões inativas após X minutos

### **Segurança**
- Session ID não deve ser previsível
- UUID ou similar
- Não usar dados sensíveis no ID

### **Escalabilidade**
- Em memória funciona para single instance
- Se usar múltiplas instâncias → Redis ou banco de dados

---

**Status**: 📋 Plano criado - Pronto para implementação

