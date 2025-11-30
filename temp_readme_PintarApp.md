# PintarApp

Aplicativo de pintura em SVG pensado para funcionar 100% offline no Android (e pronto para evoluir com anúncios e versão premium). O foco é manter uma base limpa desde o início: camadas bem separadas, tipagem forte e componentes desacoplados.

## Stack

- React Native 0.76 + TypeScript
- `react-native-svg` e `react-native-svg-transformer` para carregar vetores
- Safe Area Context, hooks e reducers para gerenciar estado imutável
- Alias `@/*` configurado em Babel/TS para manter imports curtos

## Pré-requisitos

- Node 18+
- Ambiente Android configurado (Android Studio + SDKs) conforme [guia oficial](https://reactnative.dev/docs/environment-setup)

## Instalação e execução

```bash
npm install

# abre o Metro bundler
npm start

# em outro terminal, instala/roda no dispositivo ou emulador
npm run android

# opcional: rodar no iOS (macOS)
npm run ios
```

Utilize `npm run lint`, `npm run test` e `npm run typecheck` para garantir qualidade contínua.

## Configurar emulador Android como tablet

Para rodar o aplicativo em formato de tablet (ao invés de celular):

1. **Abra o Android Studio**
2. **Acesse o AVD Manager**:
   - Menu: `Tools` > `Device Manager` (ou `Tools` > `AVD Manager` em versões antigas)
   - Ou clique no ícone de dispositivo na barra de ferramentas
3. **Crie um novo dispositivo virtual**:
   - Clique em `Create Device` (ou `+ Create Virtual Device`)
   - Na categoria **Tablets**, escolha um modelo (ex.: Pixel Tablet, Nexus 10, Pixel C)
   - Clique em `Next`
4. **Escolha uma imagem do sistema**:
   - Selecione uma versão do Android (recomendado: API 33 ou superior)
   - Clique em `Download` se necessário
   - Clique em `Next`
5. **Configure o AVD**:
   - Dê um nome ao dispositivo (ex.: "Tablet_10inch")
   - Verifique as configurações (memória, resolução)
   - Clique em `Finish`
6. **Inicie o emulador**:
   - Clique no botão ▶️ ao lado do dispositivo criado
   - Aguarde o emulador iniciar completamente
7. **Rode o aplicativo**:
   ```bash
   npm run android
   ```

O aplicativo já está configurado no `AndroidManifest.xml` para suportar tablets com telas grandes (largeScreens e xlargeScreens).

## Estrutura

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

## Funcionalidades atuais

- Tela única `ColoringScreen` com cabeçalho, tela de pintura e toolbox
- `SvgColoringSurface` aplica cores via `Path.onPress`, simulando ferramenta de preenchimento/borracha
- `ColorPalette` com lista horizontal de swatches; `Toolbox` alterna entre preencher e apagar, além de resetar o desenho
- Estado isolado no hook `useColoringSession`, baseado em reducer puro (`coloringReducer`)

## Próximos passos sugeridos

- Persistir sessões localmente (AsyncStorage/SQLite)
- Importar SVGs externos e construir biblioteca de páginas
- Adicionar zoom/pan e ferramentas extras (bucket, brush, eyedropper)
- Integrar anúncios (AdMob) e versão premium sem ads

Com essa base já é possível gerar um APK offline e evoluir gradualmente mantendo Clean Code e separação de responsabilidades.

