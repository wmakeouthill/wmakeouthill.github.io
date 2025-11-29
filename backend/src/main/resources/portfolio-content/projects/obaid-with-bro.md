# Diabo Chat - scaffold inicial

Este repositório contém um scaffold inicial para uma aplicação modular com backend em Spring Boot (Java 17, Spring Boot 3.2.3) e frontend em Angular 17.3.0.

Objetivo: uma tela com uma figura que representa o "diabo" no centro e um chat que conversa com o usuário via IA (adapter placeholder já criado).

Regras:
- Seguir estritamente `github-copilot-rules.md` (Java 17, Spring Boot 3.2.3, Angular 17.3.0, uso de `inject()`/`signal()` etc.).

Estrutura:
- `backend/` - aplicação Spring Boot modular (use cases, ports, adapters)
- `frontend/` - app Angular standalone (componente principal usando `signal()`)

Como rodar (desenvolvimento):

Backend

```bash
# no diretório raiz do repo
cd backend
mvn spring-boot:run
```

Observação: o backend agora pode servir os arquivos estáticos do frontend diretamente. Para que a aplicação Angular seja entregue pela raiz do backend, siga um dos caminhos abaixo antes de iniciar o backend:

- Desenvolvimento rápido (serve a pasta `dist` gerada localmente):

```bash
# no diretório do frontend
cd frontend
# gerar build (pode usar npx se não tiver ng instalado globalmente)
npx ng build --configuration=production

# em seguida, no diretório do backend
cd ../backend
mvn spring-boot:run
```

- Produção / empacotamento (copiar `dist` para `backend/src/main/resources/static` e executar):

```bash
cd frontend
npx ng build --configuration=production
rm -rf ../backend/src/main/resources/static/* || true
cp -r dist/* ../backend/src/main/resources/static/

cd ../backend
mvn -DskipTests package
java -jar target/diabo-chat-backend-0.1.0.jar
```

cd /workspaces/obaid-with-bro/backend && mvn -DskipTests package

Detalhes técnicos:
- O backend busca arquivos estáticos em `../frontend/dist/` (útil para desenvolvimento) e, como fallback, em `classpath:/static` (útil se você copiar os artefatos para `backend/src/main/resources/static`).
- Você pode ajustar o caminho padrão definindo a propriedade `frontend.path` ao iniciar a JVM, por exemplo: `-Dfrontend.path=/caminho/absoluto/para/dist`.


Frontend

```bash
cd frontend
npm install
# requer Angular CLI / ambiente compatível com Angular 17
npm run start
```

Notas de integração IA

- O adapter `OpenAIAdapter` em `backend` é um placeholder — substitua a implementação por integração com OpenAI, Azure ou outro provedor.
- Recomendo expor variáveis de ambiente para chaves (NUNCA commitar chaves em claro).

Integração com OpenAI (GPT)

- Para habilitar a integração com a API da OpenAI, defina a variável de ambiente `OPENAI_API_KEY` no ambiente onde o backend for executado.
	- Exemplo (Linux/macOS):

```bash
export OPENAI_API_KEY="sk-..."
```

	- Ou passe como propriedade JVM ao iniciar o backend (não recomendado em prod):

```bash
mvn spring-boot:run -Dopenai.api.key="sk-..."
```

- O `backend` agora contém um adapter `OpenAIAdapter` que lê a chave de `OPENAI_API_KEY` (ou `-Dopenai.api.key`) e faz requisições ao endpoint de Chat Completions. Se a chave não estiver definida, o chat retornará uma mensagem informando que o serviço não está configurado.

- NÃO cole sua chave diretamente no repositório. Use variáveis de ambiente ou um cofre de segredos.


Próximos passos sugeridos:
- Implementar autenticação de requests, CORS e configuração de proxy para desenvolvimento Angular → backend
- Implementar integração real com provedor de IA
- Adicionar testes unitários para `ChatUseCase`
# obaid-with-bro