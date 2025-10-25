# Investment Calculator

![Angular](https://img.shields.io/badge/Angular-18.0.0-red.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4.2-blue.svg)
![RxJS](https://img.shields.io/badge/RxJS-7.8.0-purple.svg)

## Uma calculadora de investimentos completa desenvolvida em Angular

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visitar-brightgreen.svg)](https://your-demo-link.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repositório-black.svg)](https://github.com/your-username/investment-calculator)

---

## 📋 Visão Geral

Este projeto é uma calculadora de investimentos desenvolvida durante o curso de Angular do professor Maximilian Schwarzmüller na Udemy. A aplicação demonstra conceitos avançados do Angular, incluindo signals, computed properties, serviços reativos e formulários template-driven. A ferramenta permite calcular projeções de investimentos com base em aportes iniciais e anuais, taxa de retorno esperada e duração do investimento.

### ✨ Principais Funcionalidades

- **Cálculo de Investimentos**: Projeção completa de investimentos com juros compostos
- **Interface Intuitiva**: Formulário simples e direto para entrada de dados
- **Resultados Detalhados**: Tabela anual com valores de investimento, juros e capital total
- **Formatação Monetária**: Valores exibidos em formato de moeda brasileira (BRL)
- **Arquitetura Reativa**: Uso de signals para gerenciamento de estado reativo
- **Design Moderno**: Interface elegante com gradiente e tipografia profissional

---

## 🚀 Tecnologias Utilizadas

### Frontend

- **Angular 18.0.0** - Framework principal
- **TypeScript 5.4.2** - Linguagem de programação
- **RxJS 7.8.0** - Programação reativa
- **Angular Forms** - Gerenciamento de formulários
- **Angular Signals** - Sistema de sinais reativos

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
├── header/                      # Cabeçalho com logo e título
│   ├── header.component.*       # Componente de cabeçalho
├── user-input/                 # Formulário de entrada de dados
│   ├── user-input.component.*  # Componente de input do usuário
├── investment-results/         # Exibição dos resultados
│   ├── investment-results.component.* # Componente de resultados
├── investment.service.ts        # Serviço de cálculos
└── investment-input.model.ts   # Interface de dados de entrada
```

### Modelos de Dados

#### InvestmentInput Interface

```typescript
export interface InvestmentInput {
  initialInvestment: number;
  duration: number;
  expectedReturn: number;
  annualInvestment: number;
}
```

#### Resultado do Investimento

```typescript
interface InvestmentResult {
  year: number;
  totalAmountInvested: number;
  interest: number;
  valueEndOfYear: number;
  annualInvestment: number;
  totalInterest: number;
}
```

---

## 🔧 Funcionalidades Detalhadas

### 1. Sistema de Entrada de Dados

- **Investimento Inicial**: Valor inicial a ser investido
- **Investimento Anual**: Valor adicional investido a cada ano
- **Retorno Esperado**: Taxa de retorno anual em percentual
- **Duração**: Número de anos para o cálculo
- **Validação**: Campos numéricos com valores padrão sensatos

### 2. Cálculos Financeiros

- **Juros Compostos**: Cálculo correto de juros sobre juros
- **Projeção Anual**: Resultados detalhados ano a ano
- **Capital Investido**: Total de dinheiro investido ao longo do tempo
- **Juros Totais**: Total de juros acumulados
- **Valor Final**: Valor total do investimento ao final do período

### 3. Interface do Usuário

- **Design Profissional**: Gradiente escuro com tipografia elegante
- **Formulário Responsivo**: Layout organizado em grupos de inputs
- **Tabela de Resultados**: Exibição clara dos dados calculados
- **Formatação Monetária**: Valores em Real brasileiro (BRL)
- **Feedback Visual**: Mensagem quando não há dados para exibir

---

## 🛠️ Instalação e Execução

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Angular CLI

### Passos para Instalação

1. **Clone o repositório**

   ```bash
   git clone https://github.com/your-username/investment-calculator.git
   cd investment-calculator
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

1. **Tela Inicial**: Formulário com campos para entrada de dados
2. **Preenchimento**: Usuário insere valores de investimento e parâmetros
3. **Cálculo**: Sistema processa os dados e calcula projeções
4. **Resultados**: Tabela detalhada com valores ano a ano
5. **Reset**: Formulário é limpo para novos cálculos

### Exemplo de Uso

- **Investimento Inicial**: R$ 10.000
- **Investimento Anual**: R$ 5.000
- **Retorno Esperado**: 8% ao ano
- **Duração**: 10 anos

**Resultado**: Valor final de aproximadamente R$ 95.000 com R$ 35.000 em juros totais.

---

## 🎯 Conceitos Angular Demonstrados

### Signals e Reatividade

- **Angular Signals**: Sistema moderno de sinais para estado reativo
- **Computed Properties**: Propriedades calculadas automaticamente
- **Signal Updates**: Atualizações reativas de estado
- **Dependency Injection**: Uso do `inject()` function

### Componentes Standalone

- **Standalone Components**: Componentes independentes sem módulos
- **Direct Imports**: Importação direta de dependências
- **Template Syntax**: Interpolação e binding de dados
- **Control Flow**: Nova sintaxe `@if`, `@for` do Angular 17+

### Serviços e Lógica de Negócio

- **InvestmentService**: Serviço centralizado para cálculos
- **Business Logic**: Lógica de cálculo de investimentos isolada
- **State Management**: Gerenciamento de estado via signals
- **Service Injection**: Injeção de dependência moderna

### Formulários Template-Driven

- **Two-way Data Binding**: Sincronização bidirecional com `[(ngModel)]`
- **Form Submission**: Manipulação de envio de formulários
- **Input Validation**: Validação básica de campos numéricos
- **Form Reset**: Limpeza automática após submissão

---

## 🔍 Análise Técnica

### Pontos Fortes

- ✅ **Arquitetura Moderna**: Uso de signals e standalone components
- ✅ **Separação de Responsabilidades**: Lógica de negócio isolada no serviço
- ✅ **TypeScript**: Interfaces bem definidas e tipagem forte
- ✅ **Reatividade**: Sistema reativo eficiente com signals
- ✅ **UX Intuitiva**: Interface simples e funcional
- ✅ **Cálculos Precisos**: Implementação correta de juros compostos

### Melhorias Futuras

- 🔄 **Validação Avançada**: Validação de formulários mais robusta
- 🔄 **Gráficos**: Visualização dos resultados em gráficos
- 🔄 **Exportação**: Exportar resultados para PDF/Excel
- 🔄 **Cenários Múltiplos**: Comparar diferentes cenários de investimento
- 🔄 **Histórico**: Salvar cálculos anteriores
- 🔄 **Responsividade**: Melhorar layout para dispositivos móveis

---

## 📚 Aprendizados

Este projeto foi fundamental para consolidar conhecimentos em:

- **Angular Signals**: Sistema moderno de reatividade do Angular
- **Standalone Components**: Arquitetura sem módulos
- **Serviços Avançados**: Padrões de serviços e injeção de dependência
- **Formulários Template-Driven**: Gerenciamento de formulários simples
- **Lógica de Negócio**: Implementação de cálculos financeiros complexos
- **TypeScript Avançado**: Interfaces, tipos e programação orientada a objetos

---

## 💡 Destaques Técnicos

### Implementação de Juros Compostos

```typescript
calculateInvestmentResults(data: InvestmentInput) {
  const { initialInvestment, duration, expectedReturn, annualInvestment } = data;
  const annualData = [];
  let investmentValue = initialInvestment;

  for (let i = 0; i < duration; i++) {
    const year = i + 1;
    const interestEarnedInYear = investmentValue * (expectedReturn / 100);
    investmentValue += interestEarnedInYear + annualInvestment;
    const totalInterest = investmentValue - annualInvestment * year - initialInvestment;
    
    annualData.push({
      year: year,
      interest: interestEarnedInYear,
      valueEndOfYear: investmentValue,
      annualInvestment: annualInvestment,
      totalInterest: totalInterest,
      totalAmountInvested: initialInvestment + annualInvestment * year,
    });
  }
  this.resultData.set(annualData);
}
```

### Uso de Signals para Estado Reativo

```typescript
// Serviço
resultData = signal<InvestmentResult[] | undefined>(undefined);

// Componente
results = computed(() => this.investmentService.resultData());
```

---

### Desenvolvido com ❤️ usando Angular

Projeto realizado durante o curso "Angular - The Complete Guide" do professor Maximilian Schwarzmüller
