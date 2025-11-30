# 🚀 Plano de Otimização do Chat IA - Formato TOON

## 📋 Visão Geral

Este documento descreve o plano completo para otimizar o sistema de chat com IA, implementando:
1. Formato TOON para redução de tokens
2. Limite de histórico de mensagens
3. Otimização do system prompt (carregamento condicional)
4. Token counting e logging
5. Modularização de prompts

---

## 🎯 Objetivos

- ✅ Reduzir custos de tokens em até 30-50%
- ✅ Manter qualidade das respostas da IA
- ✅ Implementar monitoramento de tokens
- ✅ Seguir Clean Architecture e Clean Code
- ✅ Implementar em pequenas etapas testáveis

---

## 📊 Análise Atual

### Problemas Identificados

1. **System Prompt Muito Grande**
   - BASE_SYSTEM_PROMPT: ~158 linhas (~4KB)
   - 9 arquivos markdown concatenados (até 4000 chars cada)
   - Total estimado: ~40-50KB de texto = ~10.000-12.500 tokens

2. **Histórico Completo Enviado**
   - Todas as mensagens anteriores são reenviadas
   - Cresce linearmente com o tempo
   - Sem limite ou sumarização

3. **Formato JSON Verboso**
   - JSON adiciona overhead de sintaxe
   - Formato TOON pode reduzir 20-40% de tokens

4. **Sem Monitoramento**
   - Não sabemos quantos tokens são usados
   - Não há métricas de otimização

---

## 🔧 Etapas de Implementação

### **ETAPA 1: Utilitário TOON Converter** ✅

**Objetivo**: Criar utilitário para converter estruturas de dados para formato TOON.

**Localização**: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/utils/`

**Arquivos**:
- `ToonConverter.java` - Classe utilitária singleton
- `ToonFormatException.java` - Exceção customizada

**Regras Clean Code**:
- ✅ Singleton pattern (`getInstance()`)
- ✅ Classe enxuta (< 300 linhas)
- ✅ Métodos pequenos (< 20 linhas)
- ✅ Tratamento de erros adequado

**Implementação**:
- Converter Map<String, Object> para TOON
- Converter List<Map<String, Object>> para TOON
- Suportar tipos primitivos (String, Number, Boolean)
- Formatação compacta (sem espaços desnecessários)

---

### **ETAPA 2: Limite de Histórico de Mensagens** ✅

**Objetivo**: Limitar histórico enviado à IA para reduzir tokens.

**Localização**: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/chat/`

**Mudanças**:
- Adicionar constante `MAX_HISTORICO_MENSAGENS = 10`
- Modificar `GerenciarHistoricoChatAdapter.obterHistorico()` para retornar apenas últimas N mensagens
- Manter histórico completo em memória, mas enviar apenas últimas

**Benefícios**:
- Redução de ~50-70% de tokens do histórico
- Mantém contexto recente relevante

---

### **ETAPA 3: Serviço de Otimização de Prompts** ✅

**Objetivo**: Modularizar system prompt e carregar apenas partes relevantes.

**Localização**: `backend/src/main/java/com/wmakeouthill/portfolio/domain/service/`

**Arquivos**:
- `PromptOptimizationService.java` - Serviço de otimização
- Refatorar `PortfolioPromptService` para usar otimização

**Funcionalidades**:
- Prompt base mínimo (sempre carregado)
- Carregamento condicional de markdowns (apenas se mencionados)
- Cache de prompts otimizados

---

### **ETAPA 4: Integração TOON no OpenAIAdapter** ✅

**Objetivo**: Usar formato TOON ao invés de JSON para reduzir tokens.

**Localização**: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/ai/OpenAIAdapter.java`

**Mudanças**:
- Usar `ToonConverter` para formatar mensagens
- Manter compatibilidade com API OpenAI (se necessário, converter TOON para JSON)
- OU: Enviar TOON diretamente se a API suportar

**Nota**: OpenAI pode não suportar TOON diretamente. Neste caso:
- Manter JSON para comunicação com API
- Usar TOON para storage/cache interno
- Ou usar TOON apenas se API suportar

---

### **ETAPA 5: Token Counting e Logging** ✅

**Objetivo**: Monitorar uso de tokens para otimização contínua.

**Localização**: `backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/ai/`

**Arquivos**:
- `TokenCounter.java` - Utilitário para contar tokens
- Adicionar logging em `OpenAIAdapter`

**Funcionalidades**:
- Estimar tokens de entrada (prompt + histórico)
- Registrar tokens de saída (resposta)
- Log de métricas por requisição
- Métricas agregadas (total, média, pico)

---

### **ETAPA 6: Carregamento Condicional de Markdowns** ✅

**Objetivo**: Carregar markdowns apenas quando mencionados na conversa.

**Localização**: `backend/src/main/java/com/wmakeouthill/portfolio/domain/service/`

**Funcionalidades**:
- Detectar menções a projetos na mensagem do usuário
- Carregar apenas markdowns relevantes
- Manter prompt base sempre carregado

**Benefícios**:
- Redução significativa de tokens do system prompt
- Carregamento mais rápido

---

## 📝 Formato TOON

TOON é um formato mais compacto que JSON. Exemplo:

**JSON:**
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello"}
  ],
  "max_tokens": 800,
  "temperature": 0.9
}
```

**TOON (formato simplificado):**
```
model:gpt-3.5-turbo
messages[
  {role:system content:"You are a helpful assistant"}
  {role:user content:"Hello"}
]
max_tokens:800
temperature:0.9
```

**Redução**: ~30-40% de tokens (sem chaves, aspas desnecessárias, etc.)

**Nota**: Se a API OpenAI não suportar TOON diretamente, podemos:
1. Usar TOON para cache/storage interno
2. Converter TOON → JSON apenas na hora de enviar
3. Ou pesquisar se OpenAI tem endpoint alternativo

---

## 🧪 Testes

Cada etapa deve incluir:
- ✅ Testes unitários
- ✅ Testes de integração
- ✅ Validação de redução de tokens
- ✅ Validação de qualidade das respostas

---

## 📈 Métricas Esperadas

- **Redução de Tokens**: 30-50%
- **Redução de Custo**: 30-50%
- **Latência**: Redução de 10-20% (menos dados = mais rápido)
- **Qualidade**: Mantida (mesma qualidade de respostas)

---

## 🔄 Ordem de Implementação

1. ✅ Etapa 2 (Limite de Histórico) - **MAIS FÁCIL E EFETIVO**
2. ✅ Etapa 5 (Token Counting) - **PARA MONITORAR GANHOS**
3. ✅ Etapa 1 (Utilitário TOON) - **FUNDAÇÃO**
4. ✅ Etapa 3 (Otimização de Prompts) - **GRANDE IMPACTO**
5. ✅ Etapa 4 (Integração TOON) - **SE APLICÁVEL**
6. ✅ Etapa 6 (Carregamento Condicional) - **OTIMIZAÇÃO AVANÇADA**

---

## ✅ Checklist de Qualidade

Para cada etapa, verificar:
- [ ] Segue Clean Architecture (camadas corretas)
- [ ] Código enxuto (classes < 300 linhas, métodos < 20 linhas)
- [ ] Usa Lombok (`@RequiredArgsConstructor`)
- [ ] Singleton quando apropriado
- [ ] Tratamento de erros adequado
- [ ] Logging apropriado
- [ ] Testes unitários
- [ ] Documentação JavaDoc

---

## 📚 Referências

- TOON Format: https://github.com/toon-format/toon
- OpenAI API Docs: https://platform.openai.com/docs/api-reference
- Clean Architecture: Princípios SOLID

---

**Última Atualização**: 2024-12-19
**Status**: 🚧 Em Implementação

