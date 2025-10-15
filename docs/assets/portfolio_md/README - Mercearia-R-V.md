# 🧾 Mercearia R&V — Sistema de Gestão de Estoque (Desktop + Web)

Um sistema completo de gestão de estoque e vendas para mercearias, com experiência desktop (Electron) e web (Angular), backend robusto em Spring Boot e banco de dados PostgreSQL embarcado. Projetado para funcionar 100% offline-first em Windows, com empacotamento do Java e do PostgreSQL dentro do instalador.

## 🚀 Visão Geral

O Mercearia R&V une uma UI moderna em Angular a um backend Spring Boot embutido e controlado pelo Electron. O aplicativo inicia o backend localmente, serve o frontend e garante que tudo esteja pronto antes de apresentar a interface ao usuário. O banco de dados é PostgreSQL embarcado, evitando dependências externas e facilitando instalações em máquinas simples.

## 🏗️ Stack Tecnológica

### Backend (Spring Boot)

- Java 21 + Spring Boot 3.5.5
- Spring Web, Spring Data JPA, Spring Security, Validation
- JWT (jjwt) para autenticação
- Liquibase para migrações e controle de schema
- OpenHTMLToPDF + PDFBox para geração de PDFs (notas)
- PostgreSQL (driver) com binários embarcados

### Frontend (Angular)

- Angular 20 + TypeScript
- Angular Material (UI)
- SCSS
- Chart.js via `ng2-charts` (visões e relatórios)

### Desktop (Electron)

- Electron 27 + TypeScript
- Empacotamento com `electron-builder`
- JDK/JRE embarcados para rodar o Spring Boot sem dependências
- Inicialização coordenada: backend → frontend → exibição (splash + healthcheck)

### Infraestrutura & DevOps

- Mono-repo com scripts Node.js utilitários em `scripts/`
- Build integrado: copia o `dist` do frontend para o backend antes do empacote Maven
- Deploy web opcional com NGINX + Certbot (ver `deploy/`)

## 🎯 Principais Funcionalidades

### 1) Gestão de Produtos e Estoque

- Cadastro, edição e listagem de produtos
- Controle de estoque e auditorias
- Upload de imagens de produtos (armazenadas em `backend-spring/uploads`)

### 1) Vendas e Caixa

- Fluxo de checkout completo
- Itens de venda, pagamentos, ajustes e estornos
- Controle de caixa (abertura/fechamento, movimentações)

### 1) Clientes

- Cadastro e consulta de clientes
- Histórico de compras por cliente

### 1) Relatórios e Documentos

- Geração de nota/recibo em PDF (OpenHTMLToPDF + PDFBox)
- Gráficos e dashboards (Chart.js)

### 1) Segurança

- Autenticação via JWT
- Perfis de usuário: `admin` e `user` (seed automático opcional em dev)

### 1) Banco de Dados Local Embarcado

- PostgreSQL embarcado com binários e data-dir no app
- Backups automatizados e scripts de manutenção
- Nunca usa URL externa por padrão (somente o banco embarcado)

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
```

1) Levantar tudo em modo dev (backend + frontend + electron):

```bash
npm run dev
```

- O backend inicia em `http://localhost:3000`
- O frontend dev server inicia em `http://localhost:4200` (o Electron detecta e abre)

Dicas úteis:

- Logs (dev) gravam no diretório raiz do workspace: `frontend.log` e `backend.log`
- Caso o Angular esteja em HTTPS de dev, o Electron aceita certificados self-signed

## 📦 Build de Produção (Instalador Desktop)

- Build completo e empacotamento para Windows:

```bash
npm run dist:win
```

- Build genérico (multi-plataforma, se hosted em ambiente compatível):

```bash
npm run dist
```

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
```

- Build do backend (gera o JAR):

```bash
npm run build:backend
```

- Build de tudo (backend → frontend → electron):

```bash
npm run build:all
```

- Servir frontend de produção localmente (útil para testes sem Electron):

```bash
npm run serve:frontend
```

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

## 🔮 Destaques Técnicos

1) Desktop-first com backend Spring Boot embutido (JDK/JRE inclusos)
2) PostgreSQL embarcado com gestão de dados e backups
3) Orquestração robusta via Electron (splash, health-check, logs, cleaning)
4) Geração de PDFs server-side para notas e comprovantes
5) Mono-repo com automações de build e deploy

## 📝 Conclusão

Este projeto demonstra experiência prática em:

- Arquitetura full-stack moderna (Angular + Spring Boot + Electron)
- Aplicações desktop com backend embutido e banco de dados local
- Segurança com JWT e profiles de acesso
- Automação de build/empacotamento e integração de recursos nativos
- Operação offline-first e suporte simplificado (logs, backups, reset)

— Desenvolvido com foco em confiabilidade e usabilidade para o dia a dia de uma mercearia.

---

Referências internas úteis:

- `deploy/README_DEPLOY.md` — guia de deploy web (NGINX + Certbot + systemd)
- `db/README.md` — anotações sobre estrutura e dados do banco em dev
- `backend-spring/pom.xml` — dependências e build do backend
- `electron/package.json` — configuração do empacotador e recursos extras
- Scripts em `scripts/` — utilitários de build, deploy e manutenção
