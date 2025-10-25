# Task Management System

![Angular](https://img.shields.io/badge/Angular-19.1.0-red.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)
![RxJS](https://img.shields.io/badge/RxJS-7.8.0-purple.svg)

## Um sistema completo de gerenciamento de tarefas desenvolvido em Angular

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visitar-brightgreen.svg)](https://your-demo-link.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repositório-black.svg)](https://github.com/your-username/first-angular-app)

---

## 📋 Visão Geral

Este projeto é um sistema de gerenciamento de tarefas desenvolvido durante o curso de Angular do professor Maximilian Schwarzmüller na Udemy. A aplicação demonstra conceitos fundamentais do Angular, incluindo componentes, serviços, formulários reativos, roteamento e gerenciamento de estado.

### ✨ Principais Funcionalidades

- **Seleção de Usuários**: Interface intuitiva para escolher entre diferentes usuários
- **Gerenciamento de Tarefas**: Criar, visualizar e remover tarefas personalizadas
- **Persistência Local**: Dados salvos automaticamente no localStorage do navegador
- **Interface Responsiva**: Design moderno e adaptável para diferentes dispositivos
- **Componentização**: Arquitetura modular com componentes reutilizáveis

---

## 🚀 Tecnologias Utilizadas

### Frontend

- **Angular 19.1.0** - Framework principal
- **TypeScript 5.7.2** - Linguagem de programação
- **RxJS 7.8.0** - Programação reativa
- **Angular Forms** - Gerenciamento de formulários
- **Angular Router** - Navegação entre componentes

### Ferramentas de Desenvolvimento

- **Angular CLI 19.1.7** - Ferramentas de linha de comando
- **Karma & Jasmine** - Framework de testes
- **TypeScript Compiler** - Compilação e verificação de tipos

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Componentes

```text
src/app/
├── app.component.*          # Componente raiz da aplicação
├── header/                  # Cabeçalho da aplicação
├── user/                    # Componente de seleção de usuário
├── tasks/                   # Módulo de gerenciamento de tarefas
│   ├── tasks.component.*    # Lista principal de tarefas
│   ├── task/               # Componente individual de tarefa
│   ├── new-task/           # Formulário de criação de tarefa
│   └── tasks.service.ts    # Serviço de gerenciamento de dados
├── shared/                 # Componentes compartilhados
│   └── card/              # Componente de card reutilizável
└── dummy-users.ts         # Dados mock de usuários
```

### Modelos de Dados

#### User Interface

```typescript
interface User {
  id: string;
  avatar: string;
  name: string;
}
```

#### Task Interface

```typescript
interface Task {
  id: string;
  userId: string;
  title: string;
  summary: string;
  dueDate: string;
}
```

---

## 🔧 Funcionalidades Detalhadas

### 1. Sistema de Usuários

- **Seleção Visual**: Interface com avatares e nomes dos usuários
- **Estado Ativo**: Indicação visual do usuário selecionado
- **Dados Mock**: Base de usuários pré-definida para demonstração

### 2. Gerenciamento de Tarefas

- **Criação**: Formulário completo para adicionar novas tarefas
- **Visualização**: Lista organizada das tarefas do usuário selecionado
- **Remoção**: Funcionalidade de marcar tarefas como concluídas
- **Persistência**: Salvamento automático no localStorage

### 3. Interface do Usuário

- **Design Moderno**: Interface limpa e intuitiva
- **Componentes Reutilizáveis**: Cards padronizados para tarefas
- **Responsividade**: Adaptação para diferentes tamanhos de tela
- **Feedback Visual**: Estados de carregamento e interação

---

## 🛠️ Instalação e Execução

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Angular CLI

### Passos para Instalação

1. **Clone o repositório**

   ```bash
   git clone https://github.com/your-username/first-angular-app.git
   cd first-angular-app
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Execute o servidor de desenvolvimento**

   ```bash
   npm start
   ```

4. **Acesse a aplicação**

   ```text
   http://localhost:4200
   ```

### Scripts Disponíveis

```bash
# Servidor de desenvolvimento
npm start

# Build para produção
npm run build

# Executar testes
npm test

# Build com watch mode
npm run watch
```

---

## 📱 Demonstração

### Fluxo Principal da Aplicação

1. **Tela Inicial**: Lista de usuários disponíveis
2. **Seleção**: Clique em um usuário para visualizar suas tarefas
3. **Gerenciamento**: Adicionar, visualizar ou remover tarefas
4. **Persistência**: Dados mantidos entre sessões

### Capturas de Tela

> Adicione aqui capturas de tela da aplicação em funcionamento

---

## 🎯 Conceitos Angular Demonstrados

### Componentes e Templates

- **Standalone Components**: Uso de componentes independentes
- **Template Syntax**: Interpolação, property binding e event binding
- **Control Flow**: Nova sintaxe `@if`, `@for` do Angular 17+

### Serviços e Injeção de Dependência

- **TasksService**: Serviço centralizado para gerenciamento de dados
- **Dependency Injection**: Uso do `inject()` function
- **Singleton Pattern**: Serviço disponível globalmente

### Formulários

- **Template-driven Forms**: Formulários baseados em template
- **Two-way Data Binding**: Sincronização bidirecional de dados
- **Form Validation**: Validação básica de campos

### Gerenciamento de Estado

- **Local State**: Estado gerenciado nos componentes
- **Service State**: Estado compartilhado via serviços
- **LocalStorage**: Persistência de dados no cliente

---

## 🔍 Análise Técnica

### Pontos Fortes

- ✅ **Arquitetura Limpa**: Separação clara de responsabilidades
- ✅ **Componentização**: Componentes pequenos e focados
- ✅ **TypeScript**: Tipagem forte e interfaces bem definidas
- ✅ **Reutilização**: Componentes compartilhados (Card)
- ✅ **Persistência**: Dados mantidos entre sessões

### Melhorias Futuras

- 🔄 **Backend Integration**: Conectar com API REST
- 🔄 **Autenticação**: Sistema de login e autorização
- 🔄 **Testes Unitários**: Cobertura completa de testes
- 🔄 **PWA**: Transformar em Progressive Web App
- 🔄 **State Management**: Implementar NgRx para estado complexo

---

## 📚 Aprendizados

Este projeto foi fundamental para consolidar conhecimentos em:

- **Fundamentos do Angular**: Componentes, serviços e injeção de dependência
- **TypeScript**: Interfaces, tipos e programação orientada a objetos
- **Arquitetura Frontend**: Padrões de design e organização de código
- **Desenvolvimento Responsivo**: CSS moderno e layouts adaptáveis
- **Gerenciamento de Estado**: Padrões para compartilhamento de dados

---

### Desenvolvido com ❤️ usando Angular

Projeto realizado durante o curso "Angular - The Complete Guide" do professor Maximilian Schwarzmüller
