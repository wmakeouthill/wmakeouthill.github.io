# 🏪 Mercearia R&V - Sistema de Gestão de Estoque

> **Sistema completo de gestão empresarial** desenvolvido com arquitetura full-stack moderna, combinando aplicação desktop (Electron) e web (Angular) com backend robusto em Spring Boot e banco PostgreSQL embarcado.

## 📋 Visão Geral

O **Mercearia R&V** é uma solução empresarial completa para gestão de estoque e vendas, projetada para operar 100% offline-first. O sistema integra uma interface moderna em Angular com um backend Spring Boot embutido, controlado via Electron, garantindo uma experiência desktop nativa sem dependências externas.

### 🎯 Principais Características

- **Arquitetura Offline-First**: Funciona completamente offline com banco PostgreSQL embarcado
- **Multiplataforma**: Desktop (Windows) e Web com mesma base de código
- **Segurança Empresarial**: Autenticação JWT com perfis de usuário diferenciados
- **Relatórios Avançados**: Geração de PDFs e dashboards com gráficos interativos
- **Deploy Simplificado**: Instalador único com todas as dependências incluídas

## 🛠️ Stack Tecnológica

### Backend & API

- **Java 21** - Linguagem principal com recursos modernos
- **Spring Boot 3.5.5** - Framework principal com starters:
  - Spring Web (REST APIs)
  - Spring Data JPA (ORM)
  - Spring Security (Autenticação/Autorização)
  - Spring Validation (Validação de dados)
  - Spring Mail (Notificações por email)
- **JWT (jjwt 0.11.5)** - Autenticação stateless
- **Liquibase** - Controle de versão e migração de banco de dados
- **PostgreSQL** - Banco de dados relacional com driver nativo
- **OpenHTMLToPDF + PDFBox** - Geração server-side de documentos PDF
- **Maven** - Gerenciamento de dependências e build

### Frontend & UI

- **Angular 20** - Framework SPA com TypeScript
- **Angular Material** - Componentes de UI seguindo Material Design
- **SCSS** - Pré-processador CSS para estilos avançados
- **Chart.js + ng2-charts** - Visualização de dados e relatórios
- **RxJS** - Programação reativa e gerenciamento de estado
- **PDF.js** - Visualização de documentos PDF no cliente

### Desktop & Empacotamento

- **Electron 27** - Framework para aplicações desktop multiplataforma
- **TypeScript** - Linguagem tipada para JavaScript
- **electron-builder** - Empacotamento e distribuição de aplicações
- **NSIS** - Criador de instaladores Windows

### DevOps & Infraestrutura

- **Node.js** - Runtime para scripts de automação
- **Mono-repo** - Estrutura de projeto unificada
- **NGINX** - Servidor web para deploy (opcional)
- **Certbot** - Certificados SSL automáticos
- **Systemd** - Gerenciamento de serviços Linux

## 🏗️ Arquitetura do Sistema

### Padrões Arquiteturais Implementados

- **Arquitetura em Camadas**: Separação clara entre apresentação, lógica de negócio e persistência
- **API REST**: Endpoints organizados por domínio (produtos, vendas, clientes, relatórios)
- **Repository Pattern**: Abstração de acesso a dados com Spring Data JPA
- **Dependency Injection**: Inversão de controle com Spring IoC
- **JWT Authentication**: Autenticação stateless com refresh tokens
- **CORS Configuration**: Configuração de políticas de origem cruzada

### Estrutura de Domínios

```
📦 Sistema de Gestão
├── 🛍️ Gestão de Produtos
│   ├── Cadastro e edição
│   ├── Controle de estoque
│   └── Upload de imagens
├── 💰 Vendas e Caixa
│   ├── Fluxo de checkout
│   ├── Controle de pagamentos
│   └── Gestão de caixa
├── 👥 Gestão de Clientes
│   ├── Cadastro completo
│   └── Histórico de compras
├── 📊 Relatórios e Analytics
│   ├── Dashboards interativos
│   ├── Geração de PDFs
│   └── Gráficos de vendas
└── 🔐 Segurança
    ├── Autenticação JWT
    └── Perfis de usuário
```

## 🚀 Funcionalidades Principais

### Gestão de Estoque

- ✅ Cadastro completo de produtos com categorização
- ✅ Controle de estoque com alertas de baixa
- ✅ Upload e gestão de imagens de produtos
- ✅ Auditoria de movimentações

### Sistema de Vendas

- ✅ Interface de ponto de venda (PDV) intuitiva
- ✅ Múltiplas formas de pagamento
- ✅ Gestão de trocas e devoluções
- ✅ Controle de caixa com abertura/fechamento

### Relatórios Empresariais

- ✅ Dashboards com métricas em tempo real
- ✅ Relatórios de vendas com filtros avançados
- ✅ Geração de notas fiscais em PDF
- ✅ Gráficos interativos de performance

### Segurança e Controle

- ✅ Autenticação JWT com refresh tokens
- ✅ Perfis de usuário (Admin/Operador)
- ✅ Controle de acesso por funcionalidade
- ✅ Logs de auditoria completos

## 🔧 Destaques Técnicos

### Orquestração Desktop

- **Splash Screen**: Interface informativa durante inicialização
- **Health Checks**: Verificação automática de serviços antes da exibição
- **Logs Estruturados**: Sistema de logging para facilitar suporte
- **Cleanup Automático**: Encerramento limpo de processos

### Banco de Dados Embarcado

- **PostgreSQL Nativo**: Binários incluídos no instalador
- **Backup Automático**: Sistema de backup integrado
- **Migração de Dados**: Liquibase para controle de schema
- **Zero Configuração**: Banco inicializa automaticamente

### Build e Deploy

- **Mono-repo**: Estrutura unificada com scripts automatizados
- **Build Integrado**: Frontend copiado automaticamente para backend
- **Instalador Único**: Todas as dependências incluídas (JDK, PostgreSQL)
- **Deploy Web Opcional**: Configuração NGINX + SSL incluída

## 📈 Métricas e Qualidade

- **Health Check Endpoint**: Monitoramento de saúde da aplicação
- **Logs Estruturados**: SLF4J com diferentes níveis de log
- **Testes Automatizados**: Suíte de testes para componentes críticos
- **Validação de Dados**: Validação server-side e client-side

## 🎨 Interface do Usuário

- **Material Design**: Interface moderna seguindo padrões Google
- **Responsivo**: Adaptação automática para diferentes resoluções
- **Acessibilidade**: Componentes com suporte a navegação por teclado
- **Tema Customizável**: Cores e estilos adaptáveis

## 📦 Instalação e Execução

### Desenvolvimento

```bash
# Instalar dependências
npm run install:all

# Executar em modo desenvolvimento
npm run dev
```

### Produção

```bash
# Build completo para Windows
npm run dist:win

# Build genérico multiplataforma
npm run dist
```

## 🔐 Segurança

- **JWT Authentication**: Tokens seguros com expiração configurável
- **CORS Policy**: Configuração de políticas de origem cruzada
- **Input Validation**: Validação rigorosa de dados de entrada
- **SQL Injection Protection**: Uso de prepared statements via JPA

## 📊 Tecnologias de Mercado Utilizadas

Este projeto demonstra proficiência em tecnologias amplamente utilizadas no mercado:

- **Java/Spring Boot**: Stack mais popular para desenvolvimento enterprise
- **Angular**: Framework líder para SPAs empresariais
- **PostgreSQL**: Banco relacional robusto e escalável
- **Electron**: Padrão para aplicações desktop multiplataforma
- **Docker/Containerização**: Preparado para deploy em containers
- **JWT**: Padrão de autenticação para APIs modernas
- **REST APIs**: Arquitetura padrão para integração de sistemas

## 🎯 Impacto e Resultados

- **Redução de Dependências**: Sistema 100% autônomo sem necessidade de instalações externas
- **Facilidade de Deploy**: Instalador único com todas as dependências
- **Manutenibilidade**: Código organizado com padrões enterprise
- **Escalabilidade**: Arquitetura preparada para crescimento
- **Experiência do Usuário**: Interface moderna e intuitiva

---

> **Desenvolvido com foco em qualidade, segurança e usabilidade empresarial**, este projeto demonstra competência em tecnologias modernas e padrões de desenvolvimento profissional.
