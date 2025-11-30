# ⚠️ Problema: Histórico Compartilhado Entre Usuários

## 🔍 Situação Atual

### **Como Está Implementado**

```java
@Component  // ← SINGLETON compartilhado!
public class GerenciarHistoricoChatAdapter {
    private final List<MensagemChat> historico = ...;  // ← ÚNICO histórico para TODOS
}
```

### **Problema**

❌ **TODOS os usuários compartilham o MESMO histórico!**

- Usuário A envia: "Olá"
- Usuário B envia: "Quem é você?"
- Usuário A vê: "Olá" + "Quem é você?" (misturado!)

**Isso é um bug sério!** 😱

---

## ✅ Solução: Histórico Por Sessão

Precisamos separar o histórico por sessão/navegador.

