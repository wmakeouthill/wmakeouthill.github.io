# 🎨 PintarApp — Aplicativo de Pintura em SVG para Android

## 🚀 Visão Geral

O **PintarApp** é um aplicativo de pintura em SVG desenvolvido em React Native, pensado para funcionar 100% offline no Android. O foco é manter uma base limpa desde o início: camadas bem separadas, tipagem forte e componentes desacoplados. O aplicativo está preparado para evoluir com anúncios e versão premium.

### 🎯 Proposta de Valor

- **Pintura em SVG**: Aplicação de cores em vetores SVG
- **100% Offline**: Funcionamento completo sem conexão
- **Arquitetura Limpa**: Camadas bem separadas e componentes desacoplados
- **TypeScript**: Tipagem forte em todo o código
- **Preparado para Monetização**: Base para anúncios e versão premium

## 🏗️ Stack Tecnológica

### Mobile (React Native)

- **React Native 0.76** - Framework mobile multiplataforma
- **TypeScript** - Tipagem estática para desenvolvimento seguro
- **react-native-svg** - Renderização e manipulação de SVG
- **react-native-svg-transformer** - Carregamento de vetores SVG
- **Safe Area Context** - Gerenciamento de áreas seguras
- **Hooks e Reducers** - Gerenciamento de estado imutável

### Arquitetura

- **Alias `@/*`** - Imports curtos configurados em Babel/TS
- **Feature-based Structure** - Organização por features
- **Clean Code** - Separação de responsabilidades
- **Testabilidade** - Componentes desacoplados

## 📁 Estrutura do Projeto

```
src/
  app/            # Composition root (App, providers)
  core/           # Design system e utilidades genéricas
  features/
    coloring/     # Domínio de pintura (componentes, hooks, estado)
  types/          # Declarações globais (e.g. SVG)
assets/svgs/      # Vetores locais incorporados ao APK
```

Cada feature mantém dados, modelos, hooks, componentes e reducers próprios para favorecer coesão e testabilidade.

## 🎯 Funcionalidades Atuais

### 1. Tela de Pintura (`ColoringScreen`)

- **Cabeçalho**: Interface de navegação
- **Tela de Pintura**: Área principal de trabalho
- **Toolbox**: Ferramentas de pintura

### 2. Superfície de Pintura SVG (`SvgColoringSurface`)

- **Aplicação de Cores**: Via `Path.onPress`
- **Ferramenta de Preenchimento**: Simulação de bucket fill
- **Ferramenta de Borracha**: Remoção de cores
- **Interação Tátil**: Controles otimizados para touch

### 3. Paleta de Cores (`ColorPalette`)

- **Lista Horizontal**: Swatches de cores
- **Seleção Visual**: Interface intuitiva
- **Cores Personalizadas**: Suporte a paletas customizadas

### 4. Toolbox

- **Alternância de Ferramentas**: Preencher e apagar
- **Reset do Desenho**: Limpeza completa
- **Controles Intuitivos**: Interface touch-friendly

### 5. Gerenciamento de Estado

- **Hook `useColoringSession`**: Estado isolado por sessão
- **Reducer Puro (`coloringReducer`)**: Lógica de estado imutável
- **Persistência Local**: Preparado para AsyncStorage/SQLite

## 🚀 Instalação e Execução

### Pré-requisitos

- **Node 18+** - Runtime JavaScript
- **Android Studio + SDKs** - Ambiente Android configurado
- **Emulador ou Dispositivo Android** - Para execução

### Instalação

```bash
npm install
```

### Execução

```bash
# Abre o Metro bundler
npm start

# Em outro terminal, instala/roda no dispositivo ou emulador
npm run android

# Opcional: rodar no iOS (macOS)
npm run ios
```

### Qualidade de Código

```bash
npm run lint      # Verificação de lint
npm run test      # Execução de testes
npm run typecheck # Verificação de tipos TypeScript
```

### Configurar Emulador Android como Tablet

O aplicativo está configurado no `AndroidManifest.xml` para suportar tablets com telas grandes (`largeScreens` e `xlargeScreens`). Para criar um emulador tablet:

1. Abra o Android Studio
2. Acesse o AVD Manager
3. Crie um novo dispositivo virtual na categoria **Tablets**
4. Escolha uma imagem do sistema (API 33+ recomendado)
5. Inicie o emulador e execute `npm run android`

## 🔮 Próximos Passos Sugeridos

### Funcionalidades Futuras

- **Persistência Local**: AsyncStorage/SQLite para salvar sessões
- **Importação de SVGs**: Importar SVGs externos e construir biblioteca de páginas
- **Ferramentas Avançadas**: Zoom/pan, brush, eyedropper
- **Monetização**: Integração com AdMob e versão premium sem ads

### Evolução do Produto

- **Biblioteca de Páginas**: Coleção de SVGs para colorir
- **Compartilhamento**: Exportar e compartilhar obras
- **Gamificação**: Sistema de conquistas e desafios
- **Versão Premium**: Remoção de anúncios e recursos exclusivos

## 🛠️ Skills Técnicas Demonstradas

### Mobile Development

- **React Native 0.76** - Framework mobile moderno
- **TypeScript** - Tipagem estática
- **SVG Manipulation** - Renderização e interação com vetores
- **State Management** - Hooks e reducers para estado imutável

### Arquitetura & Design

- **Feature-based Architecture** - Organização por domínios
- **Clean Code** - Separação de responsabilidades
- **Component Design** - Componentes desacoplados e reutilizáveis
- **Type Safety** - TypeScript em todo o código

### Mobile UX

- **Touch Interactions** - Otimização para interações tácteis
- **Offline-first** - Funcionamento sem conexão
- **Tablet Support** - Suporte a telas grandes
- **Performance** - Otimização para dispositivos móveis

## 📝 Conclusão

O **PintarApp** demonstra capacidade em desenvolvimento mobile com React Native, focando em arquitetura limpa, tipagem forte e experiência do usuário otimizada para Android. A base está preparada para evoluir gradualmente mantendo Clean Code e separação de responsabilidades.

---

## Desenvolvido com ❤️

Aplicativo de pintura SVG desenvolvido para Android, com foco em arquitetura limpa e experiência offline-first.

