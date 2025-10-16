# 🧾 Mercearia R&V — Sistema Enterprise de Gestão de Estoque

## 🚀 Visão Geral

O **Mercearia R&V** é uma solução completa e inovadora de gestão de estoque e vendas para mercearias, desenvolvida com arquitetura enterprise moderna. Esta plataforma combina uma experiência desktop premium (Electron) com backend robusto em Spring Boot e banco de dados PostgreSQL embarcado, projetada para funcionar 100% offline-first em Windows com empacotamento completo do Java e PostgreSQL dentro do instalador.

### 🎯 Proposta de Valor

- **Sistema Desktop Enterprise**: Aplicação nativa com backend embarcado
- **Operação Offline-First**: Funcionamento completo sem dependências externas
- **PostgreSQL Embarcado**: Banco de dados enterprise empacotado
- **Interface Angular Material**: UX moderna e responsiva
- **Geração de PDFs**: Relatórios e notas fiscais automatizadas
- **Gestão Completa**: Produtos, vendas, clientes e relatórios integrados

## 🏗️ Arquitetura Geral do Sistema

```mermaid
%%{title: "Arquitetura Geral do Sistema Mercearia R-V"}%%
graph TB
    A[Electron Desktop App] --> B[Spring Boot Backend]
    B --> C[PostgreSQL Database]
    B --> D[Angular Frontend]
    D --> E[Product Management]
    D --> F[Sales Management]
    D --> G[Stock Control]
    D --> H[Reports & PDFs]
    
    subgraph "Desktop Environment"
        A
        B
        C
        D
    end
    
    subgraph "Features"
        E
        F
        G
        H
    end
```text

### Fluxo Principal do Sistema

```text
1. Usuário abre aplicação Electron
2. Splash screen durante inicialização
3. Electron inicia backend Spring Boot
4. Health check do backend
5. Frontend Angular é servido
6. Usuário faz login
7. Acesso ao sistema de gestão
8. Operações de estoque/vendas
9. Geração de relatórios/PDFs
```text

### Arquitetura do Sistema

```mermaid
%%{title: "Arquitetura Detalhada Mercearia R-V"}%%
graph TB
    A[Electron App] --> B[Spring Boot Backend]
    B --> C[PostgreSQL Database]
    B --> D[Angular Frontend]
    D --> E[Product Management]
    D --> F[Sales Management]
    D --> G[Stock Control]
    D --> H[Reports & PDFs]
    
    subgraph "Desktop Environment"
        A
        B
        C
        D
    end
    
    subgraph "Features"
        E
        F
        G
        H
    end
```

## 🏗️ Stack Tecnológica Enterprise

### Backend (Spring Boot 3.5.5 + Java 21)

**Tecnologias Core:**

- **Java 21** + **Spring Boot 3.5.5** (LTS) - Stack enterprise líder mundial
- **Spring Data JPA** + **Hibernate** - ORM padrão da indústria
- **Spring Security** - Framework de segurança enterprise
- **Spring Web** + **RESTful APIs** - Arquitetura de microserviços
- **Spring Validation** - Validação robusta de dados

**Banco de Dados & Migrações:**

- **PostgreSQL 15** - Banco relacional enterprise (embarcado)
- **Liquibase** - Controle de versão de schema (padrão enterprise)
- **JDBC** - Driver nativo PostgreSQL
- **Connection Pooling** - Gerenciamento eficiente de conexões

**Segurança & Autenticação:**

- **JWT (jjwt)** - Tokens seguros para autenticação
- **Spring Security** - Controle de acesso e autorização
- **Password Encryption** - Criptografia de senhas
- **Role-based Access Control** - Controle de permissões por perfil

**Geração de Documentos:**

- **OpenHTMLToPDF** - Geração de PDFs a partir de HTML
- **PDFBox** - Manipulação avançada de PDFs
- **Template Engine** - Templates dinâmicos para relatórios

### Frontend (Angular 20 + TypeScript)

**Framework & Linguagem:**

- **Angular 20** - Framework enterprise mais robusto do mercado
- **TypeScript 5.8** - Tipagem estática para desenvolvimento escalável
- **Angular Material 20** - Componentes UI enterprise
- **Angular CDK** - Component Development Kit

**UI/UX & Estilização:**

- **SCSS** - Pré-processador CSS para estilos escaláveis
- **Angular Material Design** - Design system consistente
- **Responsive Design** - Interface adaptável para diferentes resoluções
- **Theme Customization** - Personalização de temas

**Visualização & Relatórios:**

- **Chart.js 4.4** - Biblioteca de gráficos líder de mercado
- **ng2-charts 5.0** - Integração Angular com Chart.js
- **Data Visualization** - Dashboards e relatórios interativos

### Desktop (Electron 27 + TypeScript)

**Plataforma Desktop:**

- **Electron 27** - Framework mais popular para apps desktop
- **TypeScript** - Tipagem estática no processo principal
- **Node.js Integration** - Acesso completo ao sistema operacional

**Empacotamento & Distribuição:**

- **electron-builder** - Empacotamento multiplataforma
- **NSIS Installer** - Instalador Windows profissional
- **Auto-updater** - Sistema de atualizações automáticas
- **Code Signing** - Assinatura digital para segurança

**Integração & Orquestração:**

- **JDK/JRE Embarcado** - Java runtime incluído no instalador
- **PostgreSQL Embarcado** - Banco de dados incluído
- **Health Check System** - Monitoramento de serviços
- **Splash Screen** - Interface de inicialização profissional

### Infraestrutura & DevOps

**Build & Deploy:**

- **Mono-repo Architecture** - Gerenciamento unificado de código
- **Maven** - Build system para backend Java
- **npm Scripts** - Automação de build e deploy
- **Multi-stage Build** - Otimização de builds de produção

**Deploy Web (Opcional):**

- **NGINX** - Servidor web de alta performance
- **Certbot** - Certificados SSL automáticos
- **Systemd** - Gerenciamento de serviços Linux
- **Docker** - Containerização opcional

**Monitoramento & Logs:**

- **SLF4J + Logback** - Logging estruturado
- **Health Endpoints** - Monitoramento de saúde da aplicação
- **File-based Logging** - Logs persistentes para suporte

## 🎯 Principais Funcionalidades

### 1) Gestão de Produtos e Estoque

- Cadastro, edição e listagem de produtos
- Controle de estoque e auditorias
- Upload de imagens de produtos (armazenadas em `backend-spring/uploads`)

#### Fluxo de Gestão de Produtos

```text
1. Usuário acessa módulo de produtos
2. Cadastra novo produto com informações básicas
3. Upload de imagem (opcional)
4. Define preço e estoque inicial
5. Produto fica disponível para vendas
6. Controle automático de estoque
7. Alertas de estoque baixo
```text

### 2) Vendas e Caixa

- Fluxo de checkout completo
- Itens de venda, pagamentos, ajustes e estornos
- Controle de caixa (abertura/fechamento, movimentações)

#### Fluxo de Vendas

```text
1. Abertura de caixa (usuário admin)
2. Seleção de produtos para venda
3. Adição de itens ao carrinho
4. Aplicação de descontos (opcional)
5. Seleção de forma de pagamento
6. Geração de nota fiscal/recibo
7. Atualização automática de estoque
8. Registro da venda no histórico
```text

### 3) Clientes

- Cadastro e consulta de clientes
- Histórico de compras por cliente

#### Fluxo de Gestão de Clientes

```text
1. Cadastro de novo cliente
2. Vinculação a vendas (opcional)
3. Consulta de histórico de compras
4. Análise de comportamento de compra
5. Relatórios por cliente
```text

### 4) Relatórios e Documentos

- Geração de nota/recibo em PDF (OpenHTMLToPDF + PDFBox)
- Gráficos e dashboards (Chart.js)

#### Fluxo de Relatórios

```text
1. Seleção de período e filtros
2. Geração de dados do banco
3. Processamento de estatísticas
4. Criação de gráficos (Chart.js)
5. Exportação para PDF
6. Visualização em dashboard
```text

### 5) Segurança

- Autenticação via JWT
- Perfis de usuário: `admin` e `user` (seed automático opcional em dev)

#### Fluxo de Autenticação

```text
1. Usuário insere credenciais
2. Validação no backend
3. Geração de JWT token
4. Armazenamento do token
5. Redirecionamento para dashboard
6. Middleware de autenticação
7. Controle de acesso por perfil
```text

### 6) Banco de Dados Local Embarcado

- PostgreSQL embarcado com binários e data-dir no app
- Backups automatizados e scripts de manutenção
- Nunca usa URL externa por padrão (somente o banco embarcado)

#### Fluxo de Inicialização do Banco

```text
1. Electron inicia aplicação
2. Verificação de banco existente
3. Inicialização do PostgreSQL embarcado
4. Execução de migrações (Liquibase)
5. Seed de dados iniciais (dev)
6. Conexão do Spring Boot
7. Health check de conectividade
```text

## 🔧 Sistemas Técnicos de Destaque

### Orquestração via Electron

- Splash screen informativa durante o boot
- Health-check do backend em `/health` antes de navegar para `http://<host>:3000/app/`
- Logs persistidos em arquivo para facilitar suporte
- Encerramento limpo do backend e dos processos PostgreSQL ao fechar o app

### Backend Spring Boot

- API REST organizada por domínios: produtos, vendas, caixa, clientes, relatórios
- Liquibase habilitado em desenvolvimento e desabilitado para builds empacotados
- Inicialização condicional de dados (seed) via `DataInitializer`

### Banco de Dados Embarcado

- Diretório de dados controlado pelo aplicativo (persistente entre sessões)
- Ferramentas `pg_dump` e `pg_restore` empacotadas e expostas ao backend via env

## 🗂️ Estrutura do Repositório

- `backend-spring/`: aplicação Spring Boot (Maven)
- `frontend/`: aplicação Angular
- `electron/`: processo principal, preload e configuração do builder
- `scripts/`: utilitários de build, deploy, manutenção e análise
- `deploy/`: arquivos NGINX, systemd e guias de implantação
- `db/`: `dump_data.sql` e docs do banco (uso em dev)

## ▶️ Como Executar (Desenvolvimento)

Pré-requisitos:

- Node.js LTS e npm
- Java 21 (apenas para rodar o backend em dev; o app empacotado inclui JDK)
- Maven (para build do backend em dev)

Passos rápidos:

1) Instalar dependências nas partes do monorepo:

```bash
npm run install:all
```text

1) Levantar tudo em modo dev (backend + frontend + electron):

```bash
npm run dev
```text

- O backend inicia em `http://localhost:3000`
- O frontend dev server inicia em `http://localhost:4200` (o Electron detecta e abre)

Dicas úteis:

- Logs (dev) gravam no diretório raiz do workspace: `frontend.log` e `backend.log`
- Caso o Angular esteja em HTTPS de dev, o Electron aceita certificados self-signed

## 📦 Build de Produção (Instalador Desktop)

- Build completo e empacotamento para Windows:

```bash
npm run dist:win
```text

- Build genérico (multi-plataforma, se hosted em ambiente compatível):

```bash
npm run dist
```text

O `electron-builder` copia:

- JAR do backend (`backend-spring/target/backend-spring-0.0.1-SNAPSHOT.jar`)
- `frontend/dist/sistema-estoque/browser` para `resources/frontend`
- Binários do PostgreSQL e dados
- JDK/JRE para execução do backend

Observações importantes:

- O backend em produção é iniciado pelo Electron e usa somente o PostgreSQL embarcado
- Liquibase e seed automático ficam desativados no build empacotado (DB já provisionado)

## 🧪 Comandos Úteis

- Build apenas do frontend:

```bash
npm run build:frontend
```text

- Build do backend (gera o JAR):

```bash
npm run build:backend
```text

- Build de tudo (backend → frontend → electron):

```bash
npm run build:all
```text

- Servir frontend de produção localmente (útil para testes sem Electron):

```bash
npm run serve:frontend
```text

## 🔐 Autenticação e Perfis

- Login via JWT
- Usuários padrão em dev (seed condicional): `admin` (pode controlar caixa) e `user`
- Senhas padrão podem ser definidas por envs: `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_USER_PASSWORD`

## 🗃️ Banco de Dados

- Postgres embarcado: binários em `backend-spring/pg/<plataforma>`
- Diretório de dados gerenciado pelo app em `resources/data/pg` (produção) ou caminho configurado em dev
- Backups em `backend-spring/backups` (e correspondente nos recursos empacotados)
- Dump opcional para desenvolvimento em `db/dump_data.sql`

Política do projeto:

- Sempre usar o Postgres embarcado local; não cair em URLs externas para o banco

## 🪵 Logs e Suporte

- Frontend: `frontend.log`
- Backend: `backend.log` e também `backend-stdout.log`/`backend-stderr.log` quando em dev
- Em produção empacotada, os logs são salvos ao lado da pasta `resources` do aplicativo

## 🚀 Deploy Web (Opcional)

Para hospedagem web do frontend com backend como serviço:

- Consulte `deploy/README_DEPLOY.md` (guia NGINX + Certbot + systemd)
- Arquivos prontos em `deploy/nginx/` e `deploy/systemd/`
- Scripts auxiliares em `deploy/scripts/`

## 📈 Métricas, Health e Qualidade

- Health check simples em `/health` (usado pelo Electron)
- Logs estruturados via SLF4J
- Scripts de verificação e limpeza em `scripts/`

## 🎨 Interface do Usuário

- Tema Angular Material
- Layout responsivo
- Gráficos integrados em páginas de relatório

## 🔮 Inovações Técnicas & Diferenciais Competitivos

### 1. Arquitetura Desktop-First com Backend Embarcado

**Solução inovadora** para aplicações enterprise offline:

- **Spring Boot Embarcado**: Backend enterprise rodando localmente
- **JDK/JRE Inclusos**: Zero dependências externas
- **Orquestração Inteligente**: Electron gerencia todo o ciclo de vida
- **Health Check System**: Monitoramento contínuo de serviços

### 2. PostgreSQL Embarcado com Gestão Automática

**Banco enterprise** completamente empacotado:

- **Binários Inclusos**: PostgreSQL 15 embarcado no instalador
- **Migrações Automáticas**: Liquibase para controle de schema
- **Backups Automatizados**: Sistema de backup inteligente
- **Data Directory Management**: Gestão automática de dados

### 3. Sistema de Geração de PDFs Avançado

**Geração de documentos** enterprise-grade:

- **OpenHTMLToPDF**: Conversão HTML para PDF
- **PDFBox**: Manipulação avançada de PDFs
- **Templates Dinâmicos**: Relatórios personalizáveis
- **Server-side Generation**: Performance otimizada

### 4. Mono-repo com Automação Completa

**Gerenciamento unificado** de código e build:

- **Build Integrado**: Frontend + Backend + Desktop em uma pipeline
- **Scripts Automatizados**: Deploy e empacotamento automatizado
- **Multi-environment**: Desenvolvimento, staging e produção
- **Code Quality**: Linting e validação automática

### 5. Interface Angular Material Enterprise

**UX moderna** com componentes enterprise:

- **Angular Material 20**: Design system consistente
- **Chart.js Integration**: Visualizações interativas
- **Responsive Design**: Adaptável para diferentes dispositivos
- **Theme Customization**: Personalização visual

## 🛠️ Skills Técnicas Demonstradas

### Backend Development (Enterprise)

- **Java 21 + Spring Boot 3.5.5** - Stack enterprise líder mundial
- **PostgreSQL** - Banco relacional enterprise
- **Spring Security + JWT** - Autenticação e autorização
- **Liquibase** - Controle de versão de schema
- **RESTful APIs** - Arquitetura de comunicação padrão
- **PDF Generation** - Geração de documentos

### Frontend Development (Modern)

- **Angular 20** - Framework enterprise líder de mercado
- **TypeScript** - Linguagem moderna com tipagem estática
- **Angular Material** - Componentes UI enterprise
- **Chart.js** - Visualização de dados
- **SCSS** - Pré-processador CSS profissional
- **Responsive Design** - UX adaptável

### Desktop Development

- **Electron 27** - Framework mais popular para apps desktop
- **electron-builder** - Empacotamento profissional
- **Native Integration** - Acesso ao sistema operacional
- **Health Monitoring** - Monitoramento de serviços

### DevOps & Infrastructure

- **Mono-repo** - Gerenciamento unificado de código
- **Maven** - Build system enterprise
- **npm Scripts** - Automação de build
- **NGINX + SSL** - Deploy web profissional
- **Systemd** - Gerenciamento de serviços Linux

### Database & Persistence

- **PostgreSQL** - Banco relacional enterprise
- **JPA/Hibernate** - ORM padrão da indústria
- **Liquibase** - Migrações de schema
- **Connection Pooling** - Gerenciamento de conexões

## 📊 Impacto & Resultados

### Inovações Implementadas

1. **Primeiro sistema desktop** com PostgreSQL embarcado
2. **Arquitetura híbrida** desktop + web com backend local
3. **Sistema de geração de PDFs** server-side avançado
4. **Mono-repo** com automação completa de build
5. **Operação offline-first** sem dependências externas

### Tecnologias Enterprise Utilizadas

- **Java 21 + Spring Boot** - Stack enterprise líder mundial
- **Angular 20 + TypeScript** - Framework frontend enterprise
- **PostgreSQL** - Banco relacional enterprise
- **Electron** - Framework desktop mais adotado
- **Maven + npm** - Build systems enterprise

### Diferenciais Competitivos

- **Zero dependências** externas
- **PostgreSQL embarcado** com gestão automática
- **Geração de PDFs** avançada
- **Interface moderna** com Angular Material
- **Empacotamento profissional** com instalador

## 📝 Conclusão

Este projeto demonstra **expertise avançada** em:

### Arquitetura & Design

- **Sistemas desktop** com backend embarcado
- **Arquitetura offline-first** sem dependências externas
- **Mono-repo** com gerenciamento unificado
- **Microservices** com Spring Boot

### Integração & APIs

- **RESTful APIs** enterprise
- **JWT Authentication** com Spring Security
- **PDF Generation** server-side
- **Database Management** com Liquibase

### DevOps & Deploy

- **Build Automation** com Maven e npm
- **Desktop Packaging** com electron-builder
- **Web Deploy** com NGINX e SSL
- **Health Monitoring** e logging estruturado

### Qualidade & Performance

- **TypeScript** para tipagem estática
- **Angular Material** para UX consistente
- **Chart.js** para visualizações
- **Connection Pooling** para performance

O **Mercearia R&V** representa uma **solução enterprise completa** que demonstra capacidade de criar sistemas desktop robustos, integrar tecnologias modernas e implementar arquiteturas offline-first com zero dependências externas, ideal para ambientes de produção críticos.

---

## Desenvolvido com foco em confiabilidade, usabilidade e performance enterprise

---

Referências internas úteis:

- `deploy/README_DEPLOY.md` — guia de deploy web (NGINX + Certbot + systemd)
- `db/README.md` — anotações sobre estrutura e dados do banco em dev
- `backend-spring/pom.xml` — dependências e build do backend
- `electron/package.json` — configuração do empacotador e recursos extras
- Scripts em `scripts/` — utilitários de build, deploy e manutenção
