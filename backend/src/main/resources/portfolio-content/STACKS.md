# Stacks e Tecnologias - Wesley Correia

Documentação completa das tecnologias, linguagens, frameworks e ferramentas utilizadas por Wesley Correia em seus projetos profissionais e pessoais.

## Visão Geral

Wesley Correia trabalha com uma stack moderna e enterprise, focada em desenvolvimento full-stack com Java/Spring no backend e Angular no frontend. Possui experiência diversificada em diferentes setores, desde automações simples até sistemas críticos de infraestrutura financeira.

### Stack Principal Atual

**Backend:** Java 17/21 + Spring Boot 3.x + Oracle/MySQL/PostgreSQL  
**Frontend:** Angular 17+/18/19/20 + TypeScript + RxJS  
**DevOps:** Docker + GitLab CI/CD + Google Cloud Run  
**Observabilidade:** Prometheus + Grafana + Spring Actuator  
**Banco de Dados:** Oracle, MySQL, PostgreSQL, SQLite, Redis

### Áreas de Expertise

1. **Desenvolvimento Full-Stack Enterprise** - Java/Spring + Angular
2. **Observabilidade e Monitoramento** - Prometheus, Grafana, Micrometer
3. **DevOps e Containerização** - Docker, CI/CD, Cloud Deploy
4. **Migração de Sistemas Legados** - COBOL → Java moderno
5. **Automação e RPA** - Python, Selenium, VBA
6. **Business Intelligence** - Power BI, DAX, Dashboards

## Linguagens de Programação

### Java

**Versão:** Java 17 (LTS) e Java 21

**Contexto de Uso:**

- Linguagem principal para desenvolvimento backend enterprise
- Utilizada em todos os projetos Spring Boot
- Aplicação de recursos modernos: records, sealed classes, pattern matching, text blocks
- Uso extensivo em projetos como LoL Matchmaking Fazenda, Experimenta AI - Soneca, Mercearia R-V

**Projetos:**

- LoL Matchmaking Fazenda: Backend completo com Java 21 e Spring Boot 3.3.2
- Experimenta AI - Soneca: Sistema full-stack com Java 17 e Clean Architecture
- Mercearia R-V: Sistema desktop enterprise com Java 21 e Spring Boot 3.5.5

### TypeScript

**Versão:** TypeScript 5.4.2, 5.7.2, 5.8

**Contexto de Uso:**

- Linguagem principal para desenvolvimento frontend e desktop
- Tipagem estática para desenvolvimento escalável
- Uso em todos os projetos Angular e Electron
- Programação orientada a objetos e interfaces bem definidas

**Projetos:**

- Todos os projetos Angular (17+, 18, 19, 20)
- Aplicações Electron (LoL Matchmaking, Mercearia R-V)
- Backend Node.js com TypeScript (AA Space)

### JavaScript

**Contexto de Uso:**

- Base do ecossistema frontend
- Integração com APIs e bibliotecas
- Scripts de automação e build
- Node.js para desenvolvimento backend

### Python

**Contexto de Uso:**

- Scripts de automação
- Análise de dados
- Integração com Power BI
- Automação de processos

## Frameworks e Bibliotecas Backend

### Spring Boot

**Versão:** Spring Boot 3.2.3, 3.3.2, 3.5.5

**Contexto de Uso:**

- Framework enterprise líder de mercado para desenvolvimento Java
- Base de todos os projetos backend Java
- Microserviços e APIs RESTful
- Integração com Spring Security, Spring Data JPA, Spring Web

**Projetos:**

- LoL Matchmaking Fazenda: Spring Boot 3.3.2 com Java 21
- Experimenta AI - Soneca: Spring Boot 3.2.3 com Java 17
- Mercearia R-V: Spring Boot 3.5.5 com Java 21

### Spring Framework

**Componentes Utilizados:**

- **Spring Web:** APIs RESTful e arquitetura de microserviços
- **Spring Data JPA:** ORM padrão da indústria com Hibernate
- **Spring Security:** Framework de segurança mais robusto
- **Spring Validation:** Validação de dados enterprise
- **Spring Mail:** Sistema de notificações por email
- **Spring Actuator:** Health checks e métricas

### Spring Security

**Contexto de Uso:**

- Autenticação e autorização
- JWT tokens para APIs stateless
- Controle de acesso granular
- Integração com Spring Boot

### JPA/Hibernate

**Contexto de Uso:**

- ORM padrão da indústria Java
- Mapeamento objeto-relacional
- Queries otimizadas
- Relacionamentos entre entidades

## Frameworks e Bibliotecas Frontend

### Angular

**Versões:** Angular 17.3.0, 18.0.0, 19.1.0, 20.1.3

**Contexto de Uso:**

- Framework enterprise líder de mercado para desenvolvimento frontend
- Standalone components (arquitetura moderna sem módulos)
- Signals para reatividade moderna
- Reactive Forms para formulários complexos
- Dependency Injection com `inject()`

**Projetos:**

- LoL Matchmaking Fazenda: Angular 20 com WebSockets
- Experimenta AI - Soneca: Angular 17+ com Clean Architecture
- Traffic Manager: Angular 18 com signals e standalone components
- Investment Calculator: Angular 18 com signals e computed properties
- First Angular App: Angular 19 com conceitos fundamentais
- AA Space: Angular 19 com chat em tempo real

### RxJS

**Versão:** RxJS 7.8.0

**Contexto de Uso:**

- Programação reativa (padrão enterprise)
- Observables para operações assíncronas
- Operadores para transformação de dados
- Integração com Angular HTTP Client
- Gerenciamento de estado reativo

### Angular Material

**Versão:** Angular Material 20.1.3

**Contexto de Uso:**

- Componentes UI seguindo Material Design
- Interface consistente e profissional
- Acessibilidade integrada
- Temas customizáveis

### Socket.IO

**Contexto de Uso:**

- Comunicação WebSocket em tempo real
- Chat em tempo real (AA Space)
- Atualizações instantâneas (LoL Matchmaking)
- Integração cliente-servidor bidirecional

## Bancos de Dados

### MySQL

**Versão:** MySQL 8.0+

**Contexto de Uso:**

- Banco relacional enterprise para produção
- Utilizado em projetos Spring Boot
- Integração com Spring Data JPA
- Migrações com Liquibase

**Projetos:**

- LoL Matchmaking Fazenda: MySQL 8.0 em produção
- Experimenta AI - Soneca: MySQL com Clean Architecture

### PostgreSQL

**Contexto de Uso:**

- Banco relacional enterprise robusto
- Utilizado em projetos desktop (Mercearia R-V)
- PostgreSQL embarcado em aplicações Electron
- Migrações com Liquibase

**Projetos:**

- Mercearia R-V: PostgreSQL embarcado completo

### SQLite

**Contexto de Uso:**

- Banco relacional embarcado
- Desenvolvimento e prototipagem
- Aplicações desktop leves

**Projetos:**

- AA Space: SQLite3 com TypeORM

### Redis

**Contexto de Uso:**

- Cache distribuído cloud-native
- Gerenciamento de estado em tempo real
- Distributed locks para operações atômicas
- Session management

**Projetos:**

- LoL Matchmaking Fazenda: Redis Upstash para cache e estado distribuído

## Ferramentas de Desenvolvimento

### Maven

**Contexto de Uso:**

- Gerenciamento de dependências Java
- Build e empacotamento
- Gerenciamento de ciclo de vida
- Integração com Spring Boot

### Lombok

**Versão:** Lombok 1.18.36

**Contexto de Uso:**

- Redução de boilerplate
- `@RequiredArgsConstructor` para injeção de dependência
- `@Builder` para objetos complexos
- `@Getter`, `@Setter`, `@Data` quando apropriado

### Liquibase

**Versão:** Liquibase 4.25.0

**Contexto de Uso:**

- Controle de versão de schema
- Migrações de banco de dados
- Rollback de mudanças
- Versionamento de estrutura de dados

### Git

**Contexto de Uso:**

- Controle de versão
- Colaboração em equipe
- Branching strategies
- Integração com GitHub

### GitHub

**Contexto de Uso:**

- Repositório de código
- GitHub Actions para CI/CD
- Issues e pull requests
- GitHub Pages para deploy

## Containerização e DevOps

### Docker

**Contexto de Uso:**

- Containerização de aplicações
- Multi-stage builds para otimização
- Ambientes consistentes
- Deploy simplificado

**Projetos:**

- Todos os projetos backend utilizam Docker
- Docker Compose para orquestração local

### Docker Compose

**Contexto de Uso:**

- Orquestração de múltiplos containers
- Desenvolvimento local
- Stack completo (app + banco + cache)

### Google Cloud Run

**Contexto de Uso:**

- Serverless containers
- Escalabilidade automática
- Deploy simplificado
- Integração com Cloud Build

**Projetos:**

- Portfolio Wesley: Deploy no Google Cloud Run
- LoL Matchmaking Fazenda: Backend no Cloud Run

### Cloud Build

**Contexto de Uso:**

- CI/CD automatizado
- Build de imagens Docker
- Deploy automático
- Integração com GitHub

### Kubernetes

**Contexto de Uso:**

- Orquestração de containers
- Escalabilidade horizontal
- Gerenciamento de serviços
- Deploy em produção

### NGINX

**Contexto de Uso:**

- Servidor web
- Proxy reverso
- Load balancing
- SSL/TLS termination

### Certbot

**Contexto de Uso:**

- Certificados SSL automáticos
- Renovação automática
- Integração com Let's Encrypt

## Aplicações Desktop

### Electron

**Versão:** Electron 27, 28

**Contexto de Uso:**

- Aplicações desktop multiplataforma
- Integração com APIs nativas
- Acesso ao sistema de arquivos
- Comunicação com processos backend

**Projetos:**

- LoL Matchmaking Fazenda: Electron 28 com integração LCU
- Mercearia R-V: Electron 27 com backend embarcado

### electron-builder

**Versão:** electron-builder 24.9.1

**Contexto de Uso:**

- Empacotamento de aplicações
- Criadores de instaladores (NSIS para Windows)
- Distribuição multiplataforma
- Inclusão de recursos e dependências

## Integrações e APIs

### JDA (Java Discord API)

**Contexto de Uso:**

- Integração com Discord
- Automação de servidores
- Criação de canais dinâmicos
- Gestão de permissões

**Projetos:**

- LoL Matchmaking Fazenda: Bot Discord completo com automação

### OpenAI API

**Contexto de Uso:**

- Integração com GPT
- Chatbots inteligentes
- Processamento de linguagem natural
- Geração de conteúdo

**Projetos:**

- Portfolio Wesley: Chatbot com IA treinada no portfólio
- Obaid with Bro: Chatbot temático

### LCU Integration (League of Legends)

**Contexto de Uso:**

- Integração com cliente do jogo
- Validação de ações em tempo real
- Monitoramento de partidas
- Detecção automática de jogadores

**Projetos:**

- LoL Matchmaking Fazenda: Integração completa com League of Legends

## Bibliotecas e Ferramentas Específicas

### MapStruct

**Contexto de Uso:**

- Mapeamento de objetos type-safe
- Conversão entre DTOs e entidades
- Redução de código boilerplate

### Redisson

**Contexto de Uso:**

- Distributed locks para Redis
- Operações atômicas
- Sincronização distribuída

**Projetos:**

- LoL Matchmaking Fazenda: Locks distribuídos para matchmaking

### Caffeine Cache

**Contexto de Uso:**

- Cache local de alta performance
- Cache em memória
- Otimização de consultas frequentes

### Resilience4j

**Contexto de Uso:**

- Circuit breaker
- Retry automático
- Rate limiting
- Resiliência de aplicações

### OpenHTMLToPDF

**Versão:** OpenHTMLToPDF 1.0.10

**Contexto de Uso:**

- Geração server-side de PDFs
- Templates HTML para PDF
- Relatórios automatizados

**Projetos:**

- Mercearia R-V: Geração de notas fiscais e relatórios

### PDFBox

**Versão:** PDFBox 2.0.29

**Contexto de Uso:**

- Processamento avançado de documentos PDF
- Manipulação de PDFs
- Extração de dados

### Chart.js

**Versão:** Chart.js 4.4.3

**Contexto de Uso:**

- Visualização de dados
- Gráficos interativos
- Dashboards

**Projetos:**

- Mercearia R-V: Gráficos de vendas e relatórios
- Traffic Manager: Visualização de tráfego

### TypeORM

**Versão:** TypeORM 0.3.22

**Contexto de Uso:**

- ORM moderno com TypeScript
- Migrations
- Relacionamentos

**Projetos:**

- AA Space: TypeORM com SQLite

### JWT (jjwt)

**Versão:** jjwt 0.11.5

**Contexto de Uso:**

- Autenticação stateless
- Tokens seguros
- Refresh tokens
- Integração com Spring Security

## Ferramentas de Análise e BI

### Power BI

**Contexto de Uso:**

- Análise de dados
- Business Intelligence
- Dashboards e relatórios
- Visualização de dados

### Selenium

**Contexto de Uso:**

- Automação de testes
- Web scraping
- Testes end-to-end
- Automação de navegadores

## Metodologias e Arquiteturas

### Clean Architecture

**Contexto de Uso:**

- Arquitetura limpa e modular
- Separação de responsabilidades
- Independência de frameworks
- Testabilidade

**Projetos:**

- Experimenta AI - Soneca: Clean Architecture completa
- Mercearia R-V: Arquitetura modular

### Domain-Driven Design (DDD)

**Contexto de Uso:**

- Design orientado a domínio
- Entidades e value objects
- Agregados e repositórios
- Linguagem ubíqua

### Microservices Patterns

**Contexto de Uso:**

- Arquitetura de microserviços
- Comunicação entre serviços
- Service discovery
- API Gateway

### Event-Driven Architecture

**Contexto de Uso:**

- Arquitetura orientada a eventos
- WebSockets para tempo real
- Pub/Sub patterns
- Event sourcing (quando apropriado)

## Padrões e Práticas

### RESTful APIs

**Contexto de Uso:**

- APIs RESTful
- HTTP methods (GET, POST, PUT, DELETE)
- Status codes apropriados
- Versionamento de APIs

### WebSockets

**Contexto de Uso:**

- Comunicação bidirecional em tempo real
- Chat em tempo real
- Atualizações instantâneas
- Notificações push

### JWT Authentication

**Contexto de Uso:**

- Autenticação stateless
- Tokens seguros
- Refresh tokens
- Integração com frontend

### CORS Configuration

**Contexto de Uso:**

- Controle de acesso cross-origin
- Políticas de segurança
- Configuração de headers

## Observabilidade e Monitoramento

### Spring Actuator

**Contexto de Uso:**

- Health checks
- Métricas de aplicação
- Endpoints de monitoramento
- Informações de sistema

### SLF4J + Logback

**Contexto de Uso:**

- Logging estruturado
- Diferentes níveis de log
- Logs persistidos
- Análise de logs

### Health Checks

**Contexto de Uso:**

- Monitoramento de saúde
- Verificação de dependências
- Status de serviços
- Alertas automáticos

## Resumo por Categoria

### Backend Enterprise

**Linguagens:** Java 17/21  
**Frameworks:** Spring Boot 3.x, Spring Framework  
**ORM:** JPA/Hibernate  
**Bancos de Dados:** MySQL, PostgreSQL, Oracle  
**Ferramentas:** Liquibase, Maven, Lombok  
**Uso:** Desenvolvimento de APIs RESTful, sistemas enterprise, migração de sistemas legados

### Frontend Moderno

**Framework:** Angular 17+/18/19/20  
**Linguagem:** TypeScript 5.x  
**Programação Reativa:** RxJS 7.8  
**Web Standards:** HTML5, CSS3/SCSS, JavaScript  
**Arquitetura:** Standalone Components, Signals, Reactive Forms  
**Uso:** Interfaces modernas, dashboards, aplicações SPA, sistemas em tempo real

### DevOps/Cloud

**Containerização:** Docker, Docker Compose  
**Cloud:** Google Cloud Run, Cloud Build  
**CI/CD:** CI/CD Pipelines, GitHub Actions, GitLab CI/CD  
**Infraestrutura:** NGINX, Kubernetes, Certbot  
**Uso:** Deploy automatizado, orquestração de containers, serverless, monitoramento

### Desktop

**Framework:** Electron 27/28  
**Ferramentas:** electron-builder  
**Linguagem:** TypeScript  
**Integração:** Node.js Integration  
**Uso:** Aplicações desktop multiplataforma, integração com sistemas nativos

### Integrações

**APIs Externas:** JDA (Discord), OpenAI API, LCU (League of Legends)  
**Comunicação:** Socket.IO, WebSockets  
**Uso:** Chatbots, automações, integrações em tempo real, comunicação bidirecional

### Observabilidade e Monitoramento

**Métricas:** Prometheus, Micrometer, Spring Actuator  
**Visualização:** Grafana  
**Alertas:** Alertmanager  
**Monitoramento:** Blackbox Exporter  
**Uso:** Monitoramento de sistemas críticos, análise de performance, health checks

### Qualidade e Performance

**Mapeamento:** MapStruct  
**Cache:** Redisson, Caffeine Cache  
**Resiliência:** Resilience4j  
**Logging:** SLF4J + Logback  
**Uso:** Otimização de performance, cache distribuído, circuit breakers, logs estruturados

### Business Intelligence e Análise

**BI:** Power BI, DAX  
**Automação:** Python, Selenium, VBA  
**Uso:** Dashboards executivos, análise de dados, automação de processos, web scraping

### Documentação e Ferramentas

**Controle de Versão:** Git, GitHub, GitLab  
**Documentação:** Markdown  
**Ferramentas:** Power BI, Selenium, Notion, SharePoint  
**Uso:** Versionamento, documentação técnica, colaboração, gestão de conhecimento

### Arquitetura e Metodologias

**Arquiteturas:** Clean Architecture, Domain-Driven Design, Modular Architecture  
**Padrões:** Microservices, Event-Driven Architecture  
**APIs:** RESTful APIs  
**Uso:** Design de sistemas escaláveis, separação de responsabilidades, arquitetura enterprise

## Nível de Proficiência por Tecnologia

### Expert/Avançado (Uso Profissional em Projetos Críticos)

- **Java 17/21:** Linguagem principal, uso em sistemas críticos
- **Spring Boot 3.x:** Framework principal para backend enterprise
- **Angular 17+/18:** Framework principal para frontend moderno
- **TypeScript 5.x:** Linguagem principal para frontend e desktop
- **SQL/MySQL/PostgreSQL/Oracle:** Bancos relacionais em produção
- **Docker:** Containerização em todos os projetos
- **Git/GitHub/GitLab:** Controle de versão e CI/CD
- **Liquibase:** Versionamento de banco de dados
- **Prometheus/Grafana:** Observabilidade em sistemas críticos

### Intermediário/Avançado (Uso Profissional Regular)

- **JavaScript/HTML5/CSS3:** Base do frontend
- **RxJS:** Programação reativa em Angular
- **Redis:** Cache distribuído
- **Power BI/DAX:** Dashboards e análise de dados
- **Python:** Automações e scripts
- **Selenium:** Web scraping e automação
- **VBA:** Automações em Excel
- **Node.js:** Backend JavaScript quando necessário
- **Electron:** Aplicações desktop

### Intermediário (Conhecimento e Uso Ocasional)

- **Kubernetes:** Orquestração de containers
- **NGINX:** Servidor web e proxy
- **Google Cloud Platform:** Cloud computing
- **SharePoint:** Desenvolvimento web corporativo
- **Salesforce:** CRM e gestão de relacionamento
- **Notion:** Gestão de conhecimento

## Contexto de Uso por Projeto

### Projetos Profissionais (ANBIMA/Selic)

**Stack Principal:**

- Java + Spring Boot + Angular
- Oracle Database + Liquibase
- Docker + GitLab CI/CD
- Prometheus + Grafana + Spring Actuator + Micrometer

**Contexto:** Sistemas críticos de infraestrutura financeira, migração de mainframe para Java moderno

### Projetos Pessoais (Portfólio)

**LoL Matchmaking Fazenda:**

- Java 21 + Spring Boot 3.3.2
- Angular 20 + TypeScript
- MySQL + Redis (Upstash)
- Electron 28
- Google Cloud Run

**Experimenta AI - Soneca:**

- Java 17 + Spring Boot 3.2.3
- Angular 17+ + TypeScript
- MySQL + Liquibase
- Clean Architecture

**Mercearia R-V:**

- Java 21 + Spring Boot 3.5.5
- Angular 20 + TypeScript
- PostgreSQL embarcado
- Electron 27

**AA Space:**

- Node.js + Express + TypeScript
- Angular 19 + TypeScript
- SQLite + TypeORM
- Socket.IO

## Evolução da Stack

### 2017-2018 (Início)

- Excel, SAP (sistemas corporativos básicos)

### 2018-2019 (Automação)

- VBA, Excel Avançado, Salesforce

### 2019-2024 (Transição para Tecnologia)

- Python, Selenium, VBA, RPA
- Web scraping e automações

### 2024-2025 (Gestão e BI)

- Power BI, DAX, JavaScript, SharePoint
- Dashboards e desenvolvimento web corporativo

### 2025-Atual (Full-Stack Enterprise)

- Java 17/21 + Spring Boot 3.x
- Angular 17+/18 + TypeScript
- Oracle + Liquibase
- Docker + CI/CD
- Prometheus + Grafana (observabilidade completa)
