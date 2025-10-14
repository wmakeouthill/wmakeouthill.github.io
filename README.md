# Portfólio Profissional - Angular

Um portfólio profissional moderno e responsivo desenvolvido em Angular 17+ com design elegante e integração com GitHub Pages.

## 🚀 Tecnologias Utilizadas

- **Angular 17+** - Framework principal
- **TypeScript** - Tipagem forte
- **SCSS/CSS** - Estilização moderna
- **GitHub API** - Integração automática de projetos
- **Responsive Design** - Mobile-first approach

## 🎨 Características

- ✅ Design moderno e profissional
- ✅ Dark theme padrão
- ✅ Animações sutis e elegantes
- ✅ Integração automática com GitHub
- ✅ SEO otimizado
- ✅ Performance otimizada
- ✅ Acessibilidade (WCAG 2.1)

## 📁 Estrutura do Projeto

```
portfolio/
├── src/
│   ├── app/
│   │   ├── components/          # Componentes standalone
│   │   │   ├── header/         # Navegação fixa
│   │   │   ├── hero/           # Seção inicial
│   │   │   ├── about/          # Sobre mim
│   │   │   ├── skills/         # Tecnologias
│   │   │   ├── experience/     # Experiência profissional
│   │   │   ├── education/      # Formação acadêmica
│   │   │   ├── projects/       # Projetos do GitHub
│   │   │   ├── certifications/ # Certificações
│   │   │   ├── contact/        # Formulário de contato
│   │   │   └── footer/         # Rodapé
│   │   ├── services/           # Serviços (GitHub API)
│   │   ├── models/             # Interfaces TypeScript
│   │   └── styles.css          # Estilos globais
```

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Angular CLI 17+

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/wmakeouthill/wmakeouthill.github.io.git
   cd wmakeouthill.github.io/portfolio
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure o GitHub API (opcional):**
   - Edite `src/app/services/github.service.ts`
   - Altere o `username` para seu usuário do GitHub

4. **Personalize o conteúdo:**
   - Edite os componentes em `src/app/components/`
   - Atualize informações pessoais, experiências, etc.

## 🚀 Desenvolvimento Local

```bash
# Iniciar servidor de desenvolvimento
ng serve

# Acesse: http://localhost:4200
```

## 📦 Build para Produção

```bash
# Build otimizado
ng build --configuration production
```

## 🌐 Deploy no GitHub Pages

### Método 1: Script Automático

```bash
# Executar script de deploy
chmod +x deploy.sh
./deploy.sh
```

### Método 2: Manual

1. **Build da aplicação:**
   ```bash
   ng build --configuration production
   ```

2. **Copiar arquivos:**
   ```bash
   cp -r dist/portfolio/browser/* docs/
   ```

3. **Commit e push:**
   ```bash
   git add docs/
   git commit -m "Deploy portfolio"
   git push origin main
   ```

4. **Configurar GitHub Pages:**
   - Vá para Settings > Pages
   - Source: "Deploy from a branch"
   - Branch: main
   - Folder: /docs

## 🎨 Personalização

### Cores
As cores estão definidas em `src/styles.css` como variáveis CSS:

```css
:root {
  --color-primary: #002E59;    /* Azul escuro */
  --color-accent: #DBC27D;     /* Dourado */
  --color-dark: #1a1a1a;       /* Cinza escuro */
  /* ... */
}
```

### Conteúdo
Personalize o conteúdo editando os componentes:

- **Informações pessoais:** `about.component.ts`
- **Experiência:** `experience.component.ts`
- **Projetos:** `projects.component.ts` (integração automática com GitHub)
- **Skills:** `skills.component.ts`
- **Contato:** `contact.component.ts`

### GitHub Integration
Para integração automática com GitHub:

1. Atualize o username em `github.service.ts`
2. Os projetos serão carregados automaticamente da API do GitHub
3. Fallback para projetos locais se houver erro na API

## 📱 Responsividade

O portfólio é totalmente responsivo e otimizado para:

- 📱 Mobile (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large screens (1200px+)

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm start          # ng serve
npm run build      # ng build
npm run watch      # ng build --watch
npm run test       # ng test

# Produção
npm run build:prod # ng build --configuration production
```

## 📈 Performance

- **Lazy Loading:** Componentes carregados sob demanda
- **Tree Shaking:** Apenas código utilizado é incluído
- **Minificação:** CSS e JS otimizados
- **Compressão:** Assets comprimidos
- **Caching:** Headers apropriados para cache

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

**Seu Nome**
- LinkedIn: [linkedin.com/in/seu-perfil](https://linkedin.com/in/seu-perfil)
- GitHub: [github.com/wmakeouthill](https://github.com/wmakeouthill)
- Email: seuemail@exemplo.com

---

⭐ **Dê uma estrela se gostou do projeto!**
