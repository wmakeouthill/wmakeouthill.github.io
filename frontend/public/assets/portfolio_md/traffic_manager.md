# Traffic Manager Dashboard

![Angular](https://img.shields.io/badge/Angular-18.0.0-red.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4.2-blue.svg)
![RxJS](https://img.shields.io/badge/RxJS-7.8.0-purple.svg)

## Um dashboard completo de monitoramento de tráfego e gerenciamento de tickets desenvolvido em Angular

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visitar-brightgreen.svg)](https://your-demo-link.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repositório-black.svg)](https://github.com/your-username/traffic-manager)

---

## 📋 Visão Geral

Este projeto é um dashboard de monitoramento desenvolvido durante estudos avançados de Angular. A aplicação demonstra conceitos modernos do Angular 18, incluindo standalone components, signals, lifecycle hooks avançados, e arquitetura de componentes reutilizáveis para criação de interfaces de monitoramento em tempo real.

### ✨ Principais Funcionalidades

- **Monitoramento de Servidor**: Status em tempo real com atualizações automáticas
- **Análise de Tráfego**: Visualização de dados de tráfego com gráficos dinâmicos
- **Sistema de Tickets**: Gerenciamento completo de tickets de suporte
- **Dashboard Modular**: Interface organizada em widgets independentes
- **Componentes Reutilizáveis**: Arquitetura baseada em componentes compartilhados

---

## 🚀 Tecnologias Utilizadas

### Frontend

- **Angular 18.0.0** - Framework principal com standalone components
- **TypeScript 5.4.2** - Linguagem de programação com tipagem forte
- **RxJS 7.8.0** - Programação reativa e observables
- **Angular Forms** - Gerenciamento de formulários
- **Angular Signals** - Sistema de sinais para reatividade

### Ferramentas de Desenvolvimento

- **Angular CLI 18.0.0** - Ferramentas de linha de comando
- **Karma & Jasmine** - Framework de testes
- **TypeScript Compiler** - Compilação e verificação de tipos

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Componentes

```text
src/app/
├── app.component.*              # Componente raiz da aplicação
├── header/                      # Cabeçalho da aplicação
├── dashboard/                   # Módulo principal do dashboard
│   ├── dashboard-item/          # Componente wrapper para widgets
│   ├── server-status/           # Monitoramento de status do servidor
│   ├── traffic/                 # Visualização de dados de tráfego
│   └── tickets/                 # Sistema de gerenciamento de tickets
│       ├── tickets.component.*  # Lista principal de tickets
│       ├── ticket/              # Componente individual de ticket
│       ├── new-ticket/          # Formulário de criação de ticket
│       └── ticket.model.ts     # Modelo de dados do ticket
└── shared/                      # Componentes compartilhados
    ├── button/                  # Componente de botão reutilizável
    └── control/                 # Componente de controle de formulário
```

### Modelos de Dados

#### Ticket Interface

```typescript
interface Ticket {
  id: string;
  title: string;
  request: string;
  status: 'open' | 'closed';
}
```

#### Traffic Data Interface

```typescript
interface TrafficData {
  id: string;
  value: number;
}
```

---

## 🔧 Funcionalidades Detalhadas

### 1. Monitoramento de Servidor

- **Status em Tempo Real**: Atualização automática a cada 5 segundos
- **Estados Dinâmicos**: Online, Offline e Unknown com probabilidades configuráveis
- **Angular Signals**: Uso de signals para reatividade eficiente
- **Lifecycle Management**: Cleanup automático de intervalos com DestroyRef

### 2. Análise de Tráfego

- **Visualização de Dados**: Gráfico de barras dinâmico
- **Dados Simulados**: Dataset de demonstração com valores realistas
- **Cálculo Automático**: Máximo dinâmico para normalização visual
- **Interface Responsiva**: Adaptação para diferentes tamanhos de tela

### 3. Sistema de Tickets

- **Criação de Tickets**: Formulário completo com validação
- **Gerenciamento de Estado**: Lista dinâmica de tickets
- **Mudança de Status**: Transição entre aberto e fechado
- **Event Handling**: Comunicação entre componentes via outputs

### 4. Arquitetura Modular

- **Dashboard Items**: Componentes wrapper para organização
- **Componentes Compartilhados**: Button e Control reutilizáveis
- **Standalone Components**: Arquitetura moderna sem NgModules
- **ViewChild e ViewChild.required**: Acesso a elementos DOM

---

## 🛠️ Instalação e Execução

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Angular CLI

### Passos para Instalação

1. **Clone o repositório**

   ```bash
   git clone https://github.com/your-username/traffic-manager.git
   cd traffic-manager
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

1. **Dashboard Principal**: Visualização de três widgets principais
2. **Monitoramento**: Status do servidor atualizado automaticamente
3. **Tráfego**: Gráfico de dados de tráfego em tempo real
4. **Tickets**: Criação e gerenciamento de tickets de suporte

### Capturas de Tela

> Adicione aqui capturas de tela da aplicação em funcionamento

---

## 🎯 Conceitos Angular Demonstrados

### Standalone Components

- **Componentes Independentes**: Uso de standalone components sem NgModules
- **Importação Direta**: Importação de componentes diretamente nos imports
- **Arquitetura Moderna**: Padrão recomendado do Angular 17+

### Angular Signals

- **Reatividade Moderna**: Uso de signals para estado reativo
- **Effect API**: Reação automática a mudanças de estado
- **Performance**: Otimização de detecção de mudanças

### Lifecycle Hooks Avançados

- **OnInit e AfterViewInit**: Hooks de inicialização
- **DestroyRef**: Gerenciamento moderno de cleanup
- **ViewChild**: Acesso a elementos DOM e componentes filhos

### Event Handling

- **Output API**: Uso da nova API de outputs
- **EventEmitter**: Comunicação entre componentes
- **Form Handling**: Gerenciamento de formulários com FormsModule

---

## 🔍 Análise Técnica

### Pontos Fortes

- ✅ **Arquitetura Moderna**: Uso de standalone components e signals
- ✅ **Componentização**: Componentes pequenos e focados
- ✅ **Reutilização**: Componentes compartilhados bem estruturados
- ✅ **Lifecycle Management**: Cleanup adequado de recursos
- ✅ **TypeScript**: Tipagem forte e interfaces bem definidas
- ✅ **Performance**: Uso eficiente de signals para reatividade

### Melhorias Futuras

- 🔄 **Backend Integration**: Conectar com APIs reais de monitoramento
- 🔄 **WebSocket**: Implementar comunicação em tempo real
- 🔄 **Testes Unitários**: Cobertura completa de testes
- 🔄 **PWA**: Transformar em Progressive Web App
- 🔄 **State Management**: Implementar NgRx para estado complexo
- 🔄 **Charts Library**: Integrar biblioteca de gráficos profissional

---

## 📚 Aprendizados

Este projeto foi fundamental para consolidar conhecimentos em:

- **Angular Moderno**: Standalone components e signals
- **Lifecycle Hooks**: Gerenciamento avançado de ciclo de vida
- **Arquitetura Frontend**: Padrões de design para dashboards
- **Component Communication**: Event handling e outputs
- **Performance**: Otimização com signals e cleanup adequado
- **TypeScript Avançado**: Interfaces e tipagem complexa

---

## 🎨 Design e UX

### Interface do Usuário

- **Design Limpo**: Interface minimalista e profissional
- **Widgets Organizados**: Layout em grid responsivo
- **Feedback Visual**: Estados claros para diferentes situações
- **Componentes Consistentes**: Padrão visual unificado

### Responsividade

- **Mobile First**: Design adaptável para dispositivos móveis
- **Grid Layout**: Organização flexível dos componentes
- **Typography**: Hierarquia visual clara

---

### Desenvolvido com ❤️ usando Angular

Projeto realizado durante estudos avançados de Angular, demonstrando conceitos modernos e melhores práticas de desenvolvimento frontend.
