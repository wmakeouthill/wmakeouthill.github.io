# 🌍 Documentação Completa: Implementação de Internacionalização (i18n)

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura da Solução](#arquitetura-da-solução)
3. [Frontend - Configuração Angular i18n](#frontend---configuração-angular-i18n)
4. [Frontend - Estrutura de Arquivos de Tradução](#frontend---estrutura-de-arquivos-de-tradução)
5. [Frontend - Implementação do Serviço de i18n](#frontend---implementação-do-serviço-de-i18n)
6. [Frontend - Modificação dos Componentes](#frontend---modificação-dos-componentes)
7. [Frontend - Seletor de Idioma](#frontend---seletor-de-idioma)
8. [Backend - Suporte a Múltiplos Idiomas](#backend---suporte-a-múltiplos-idiomas)
9. [Backend - Modificação do Chat](#backend---modificação-do-chat)
10. [Persistência da Preferência do Usuário](#persistência-da-preferência-do-usuário)
11. [Boas Práticas Obrigatórias](#-boas-práticas-obrigatórias-alinhadas-ao-cursorrules)
12. [Checklist de Implementação](#checklist-de-implementação)
13. [Plano de Execução Segura](#-plano-de-execução-segura-passos-curtos)
14. [Exemplos Práticos](#exemplos-práticos)

---

## 🎯 Visão Geral

Este documento descreve como implementar um sistema completo de internacionalização (i18n) para o portfólio, permitindo que o site funcione em **Português** e **Inglês**, incluindo:

- ✅ Interface do usuário traduzida
- ✅ Chat com IA respondendo no idioma selecionado
- ✅ Persistência da preferência do usuário
- ✅ Seletor de idioma no header
- ✅ Detecção automática do idioma do navegador

---

## 🏗️ Arquitetura da Solução

### Fluxo de Dados

```
┌─────────────────┐
│   Usuário       │
│  Seleciona PT/EN│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  i18n Service   │ ◄─── LocalStorage (persistência)
│  (Frontend)     │
└────────┬────────┘
         │
         ├──► Componentes Angular (traduções)
         │
         └──► Chat Service ──► Backend ──► OpenAI (idioma no prompt)
```

### Componentes Principais

1. **Frontend:**
   - Serviço de i18n (gerenciamento de idioma)
   - Arquivos JSON de tradução (pt.json, en.json)
   - Pipe de tradução customizado
   - Seletor de idioma no header
   - Interceptor HTTP (envia idioma para backend)

2. **Backend:**
   - Recebe header `Accept-Language` ou `X-Language`
   - Modifica system prompt da IA baseado no idioma
   - Responde no idioma correto

---

## 📦 Frontend - Configuração Angular i18n

### 1. Instalação de Dependências

O Angular 20 já possui suporte nativo a i18n, mas vamos usar uma abordagem mais flexível com arquivos JSON e um serviço customizado para ter controle total sobre as traduções.

**Não é necessário instalar pacotes adicionais** - vamos criar nossa própria solução leve.

### 2. Estrutura de Pastas

Use assets para os JSON (servidos pelo Angular) e deixe os utilitários em `app/i18n`:

```
frontend/src/
├── app/
│   ├── i18n/
│   │   ├── i18n.service.ts          # Serviço principal de i18n
│   │   ├── i18n.pipe.ts             # Pipe para traduções no template
│   │   └── language.interceptor.ts  # Interceptor HTTP
│   └── ...
├── assets/
│   └── i18n/
│       ├── pt.json                  # Traduções em português
│       └── en.json                  # Traduções em inglês
```

---

## 📁 Frontend - Estrutura de Arquivos de Tradução

### `frontend/src/assets/i18n/pt.json`

```json
{
  "common": {
    "loading": "Carregando...",
    "error": "Erro",
    "success": "Sucesso",
    "close": "Fechar",
    "cancel": "Cancelar",
    "confirm": "Confirmar",
    "save": "Salvar",
    "edit": "Editar",
    "delete": "Excluir",
    "back": "Voltar",
    "next": "Próximo",
    "previous": "Anterior"
  },
  "header": {
    "home": "Início",
    "about": "Sobre",
    "skills": "Skills",
    "experience": "Experiência",
    "education": "Educação",
    "projects": "Projetos",
    "certifications": "Certificações",
    "contact": "Contato"
  },
  "hero": {
    "greeting": "Olá, eu sou",
    "title": "Desenvolvedor Full Stack",
    "tagline": "Transformando ideias em código. Criando experiências digitais incríveis com tecnologias modernas e design elegante.",
    "viewProjects": "Ver Projetos",
    "myResume": "Meu Currículo",
    "contactMe": "Entre em Contato",
    "yearsExperience": "Anos de Experiência",
    "completedProjects": "Projetos Completos",
    "technologies": "Tecnologias que tive contato e experiência",
    "scroll": "Scroll"
  },
  "about": {
    "title": "Sobre Mim",
    "name": "Wesley de Carvalho Augusto Correia",
    "titleRole": "Desenvolvedor Full Stack",
    "yearsOfExperience": "Anos de Experiência",
    "age": "Idade",
    "location": "Localização",
    "email": "Email",
    "driverLicense": "CNH",
    "available": "Disponível",
    "notAvailable": "Indisponível",
    "bio": [
      "Desde as lan houses da infância, onde comecei a trabalhar, até hoje, minha trajetória é marcada pela paixão por tecnologia e apoio a negócios com soluções de T.I., suporte técnico e automações. Atuei como autônomo, na empresa familiar de T.I. e em indústrias como gás e energia (Petrobras), tabaco (Philip Morris), jurídico e infraestrutura financeira crítica (Banco Central/Anbima/SELIC). Essa diversidade forjou minha versatilidade técnica e visão estratégica. Analítico e solucionador, identifico gargalos e crio automações que geram eficiência mensurável. Adapto-me com facilidade a grandes corporações ou contextos dinâmicos, destacando-me em soluções criativas sob pressão. Mais que executar, entendo contextos, proponho melhorias e entrego valor. Aprendo rápido, valorizo colaboração, gosto de ser útil e ajudar pessoas e busco desafios que unam inovação e impacto no negócio."
    ],
    "highlights": {
      "experience": {
        "title": "Experiência",
        "value": "Experiência em TI com suporte, desenvolvimento e Governança. Além de experiências administrativas e de backoffice jurídico e salesforce."
      },
      "education": {
        "title": "Formação",
        "value": "Graduado em Direito. Cursando Pós-graduação em Desenvolvimento FullStack Java, MBA em Gestão de Projetos (trancada) e cursando Ciências da Computação (em andamento)"
      },
      "projects": {
        "title": "Projetos",
        "value": "Automação e Modernização de Sistemas e desenvolvimento fullstack de aplicações."
      },
      "status": {
        "title": "Status",
        "value": "Disponível para oportunidades!"
      }
    },
    "softSkills": {
      "title": "Soft Skills",
      "items": [
        "Boa Comunicação",
        "Inglês Intermediário",
        "Gestão de conflitos / Trabalho em equipe",
        "Hiperfoco / Proatividade",
        "Inteligência emocional e autocontrole",
        "Autodidata",
        "Adaptado a rotinas Ágil, Scrum"
      ]
    }
  },
  "skills": {
    "title": "Habilidades Técnicas",
    "frontend": "Frontend",
    "backend": "Backend",
    "database": "Banco de Dados",
    "devops": "DevOps",
    "tools": "Ferramentas",
    "level": {
      "production": "Produção",
      "advanced": "Avançado",
      "intermediate": "Intermediário",
      "beginner": "Iniciante"
    },
    "projectsCount": "projetos"
  },
  "experience": {
    "title": "Experiência Profissional",
    "present": "Presente",
    "months": "meses",
    "years": "anos"
  },
  "education": {
    "title": "Formação Acadêmica",
    "inProgress": "Em andamento",
    "completed": "Concluído"
  },
  "projects": {
    "title": "Projetos",
    "viewDetails": "Ver Detalhes",
    "viewCode": "Ver Código",
    "liveDemo": "Demo ao Vivo",
    "technologies": "Tecnologias",
    "description": "Descrição"
  },
  "certifications": {
    "title": "Certificações",
    "viewCertificate": "Ver Certificado",
    "download": "Baixar",
    "issuedBy": "Emitido por",
    "issuedDate": "Data de Emissão"
  },
  "contact": {
    "title": "Entre em Contato",
    "subtitle": "Vamos conversar sobre oportunidades ou projetos!",
    "name": "Nome",
    "namePlaceholder": "Seu nome",
    "email": "Email",
    "emailPlaceholder": "seu@email.com",
    "message": "Mensagem",
    "messagePlaceholder": "Sua mensagem aqui...",
    "send": "Enviar Mensagem",
    "sending": "Enviando...",
    "success": "Mensagem enviada com sucesso!",
    "error": "Erro ao enviar mensagem. Tente novamente."
  },
  "chat": {
    "title": "Chat com IA",
    "placeholder": "Digite sua mensagem...",
    "send": "Enviar",
    "clear": "Limpar",
    "newChat": "Nova Conversa",
    "thinking": "Pensando...",
    "error": "Erro ao enviar mensagem"
  },
  "footer": {
    "rights": "Todos os direitos reservados",
    "builtWith": "Construído com",
    "and": "e"
  }
}
```

### `frontend/src/assets/i18n/en.json`

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "close": "Close",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "save": "Save",
    "edit": "Edit",
    "delete": "Delete",
    "back": "Back",
    "next": "Next",
    "previous": "Previous"
  },
  "header": {
    "home": "Home",
    "about": "About",
    "skills": "Skills",
    "experience": "Experience",
    "education": "Education",
    "projects": "Projects",
    "certifications": "Certifications",
    "contact": "Contact"
  },
  "hero": {
    "greeting": "Hello, I'm",
    "title": "Full Stack Developer",
    "tagline": "Transforming ideas into code. Creating amazing digital experiences with modern technologies and elegant design.",
    "viewProjects": "View Projects",
    "myResume": "My Resume",
    "contactMe": "Contact Me",
    "yearsExperience": "Years of Experience",
    "completedProjects": "Completed Projects",
    "technologies": "Technologies I've worked with",
    "scroll": "Scroll"
  },
  "about": {
    "title": "About Me",
    "name": "Wesley de Carvalho Augusto Correia",
    "titleRole": "Full Stack Developer",
    "yearsOfExperience": "Years of Experience",
    "age": "Age",
    "location": "Location",
    "email": "Email",
    "driverLicense": "Driver's License",
    "available": "Available",
    "notAvailable": "Unavailable",
    "bio": [
      "From the internet cafes of my childhood where I started working, to today, my journey is marked by a passion for technology and supporting businesses with IT solutions, technical support, and automation. I've worked as a freelancer, in the family IT company, and in industries such as gas and energy (Petrobras), tobacco (Philip Morris), legal, and critical financial infrastructure (Central Bank/Anbima/SELIC). This diversity has forged my technical versatility and strategic vision. Analytical and solution-oriented, I identify bottlenecks and create automations that generate measurable efficiency. I adapt easily to large corporations or dynamic contexts, standing out in creative solutions under pressure. More than executing, I understand contexts, propose improvements, and deliver value. I learn quickly, value collaboration, enjoy being useful and helping people, and seek challenges that combine innovation and business impact."
    ],
    "highlights": {
      "experience": {
        "title": "Experience",
        "value": "Experience in IT with support, development, and Governance. In addition to administrative experiences and legal and salesforce backoffice."
      },
      "education": {
        "title": "Education",
        "value": "Graduated in Law. Pursuing a Postgraduate degree in FullStack Java Development, MBA in Project Management (paused) and studying Computer Science (in progress)"
      },
      "projects": {
        "title": "Projects",
        "value": "Automation and System Modernization and fullstack application development."
      },
      "status": {
        "title": "Status",
        "value": "Available for opportunities!"
      }
    },
    "softSkills": {
      "title": "Soft Skills",
      "items": [
        "Good Communication",
        "Intermediate English",
        "Conflict Management / Teamwork",
        "Hyperfocus / Proactivity",
        "Emotional Intelligence and Self-control",
        "Self-taught",
        "Adapted to Agile, Scrum routines"
      ]
    }
  },
  "skills": {
    "title": "Technical Skills",
    "frontend": "Frontend",
    "backend": "Backend",
    "database": "Database",
    "devops": "DevOps",
    "tools": "Tools",
    "level": {
      "production": "Production",
      "advanced": "Advanced",
      "intermediate": "Intermediate",
      "beginner": "Beginner"
    },
    "projectsCount": "projects"
  },
  "experience": {
    "title": "Professional Experience",
    "present": "Present",
    "months": "months",
    "years": "years"
  },
  "education": {
    "title": "Academic Education",
    "inProgress": "In Progress",
    "completed": "Completed"
  },
  "projects": {
    "title": "Projects",
    "viewDetails": "View Details",
    "viewCode": "View Code",
    "liveDemo": "Live Demo",
    "technologies": "Technologies",
    "description": "Description"
  },
  "certifications": {
    "title": "Certifications",
    "viewCertificate": "View Certificate",
    "download": "Download",
    "issuedBy": "Issued by",
    "issuedDate": "Issue Date"
  },
  "contact": {
    "title": "Get in Touch",
    "subtitle": "Let's talk about opportunities or projects!",
    "name": "Name",
    "namePlaceholder": "Your name",
    "email": "Email",
    "emailPlaceholder": "your@email.com",
    "message": "Message",
    "messagePlaceholder": "Your message here...",
    "send": "Send Message",
    "sending": "Sending...",
    "success": "Message sent successfully!",
    "error": "Error sending message. Please try again."
  },
  "chat": {
    "title": "AI Chat",
    "placeholder": "Type your message...",
    "send": "Send",
    "clear": "Clear",
    "newChat": "New Chat",
    "thinking": "Thinking...",
    "error": "Error sending message"
  },
  "footer": {
    "rights": "All rights reserved",
    "builtWith": "Built with",
    "and": "and"
  }
}
```

---

## 🔧 Frontend - Implementação do Serviço de i18n

### `frontend/src/app/i18n/i18n.service.ts`

```typescript
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type Language = 'pt' | 'en';

interface Translations {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly http = inject(HttpClient);
  
  // Idioma atual (signal reativo)
  private readonly currentLanguage = signal<Language>(this.detectInitialLanguage());
  
  // Traduções carregadas
  private translations: Map<Language, Translations> = new Map();
  
  // Idioma atual como computed (readonly)
  readonly language = computed(() => this.currentLanguage());
  
  // Traduções atuais como computed
  readonly translations$ = computed(() => {
    const lang = this.currentLanguage();
    return this.translations.get(lang) || {};
  });

  constructor() {
    // Carrega traduções iniciais
    this.loadTranslations(this.currentLanguage()).subscribe();
    
    // Efeito para persistir mudanças de idioma
    effect(() => {
      const lang = this.currentLanguage();
      this.persistLanguage(lang);
    });
  }

  /**
   * Detecta o idioma inicial do navegador ou localStorage
   */
  private detectInitialLanguage(): Language {
    // 1. Tenta carregar do localStorage
    const saved = localStorage.getItem('portfolio-language');
    if (saved === 'pt' || saved === 'en') {
      return saved as Language;
    }
    
    // 2. Detecta do navegador
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang.startsWith('en')) {
      return 'en';
    }
    
    // 3. Padrão: português
    return 'pt';
  }

  /**
   * Carrega traduções de um idioma
   */
  private loadTranslations(lang: Language): Observable<Translations> {
    // Se já carregou, retorna do cache
    if (this.translations.has(lang)) {
      return of(this.translations.get(lang)!);
    }

    return this.http.get<Translations>(`/assets/i18n/${lang}.json`).pipe(
      map(translations => {
        this.translations.set(lang, translations);
        return translations;
      }),
      catchError(error => {
        console.error(`Erro ao carregar traduções ${lang}:`, error);
        // Retorna objeto vazio em caso de erro
        return of({});
      })
    );
  }

  /**
   * Altera o idioma atual
   */
  setLanguage(lang: Language): void {
    if (lang !== this.currentLanguage()) {
      this.currentLanguage.set(lang);
      // Carrega traduções se ainda não carregou
      if (!this.translations.has(lang)) {
        this.loadTranslations(lang).subscribe();
      }
    }
  }

  /**
   * Obtém uma tradução por chave (ex: 'header.home' ou 'hero.greeting')
   */
  translate(key: string, params?: Record<string, any>): string {
    const translations = this.translations$();
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Se não encontrou, retorna a chave
        console.warn(`Tradução não encontrada: ${key}`);
        return key;
      }
    }

    // Se for string, substitui parâmetros
    if (typeof value === 'string') {
      if (params) {
        return this.replaceParams(value, params);
      }
      return value;
    }

    // Se for array, retorna o primeiro item (útil para arrays de strings)
    if (Array.isArray(value)) {
      return value[0] || key;
    }

    return key;
  }

  /**
   * Substitui parâmetros em uma string (ex: "Olá {name}" -> "Olá Wesley")
   */
  private replaceParams(text: string, params: Record<string, any>): string {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * Persiste o idioma no localStorage
   */
  private persistLanguage(lang: Language): void {
    localStorage.setItem('portfolio-language', lang);
  }

  /**
   * Obtém o idioma atual como string para enviar ao backend
   */
  getLanguageForBackend(): string {
    return this.currentLanguage();
  }
}
```

### `frontend/src/app/i18n/i18n.pipe.ts`

```typescript
import { Pipe, PipeTransform, inject, ChangeDetectorRef } from '@angular/core';
import { I18nService } from './i18n.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Não é pure para reagir a mudanças de idioma
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    // Observa mudanças no idioma
    this.i18n.language();
  }

  transform(key: string, params?: Record<string, any>): string {
    // Força detecção de mudanças quando o idioma muda
    this.i18n.language();
    return this.i18n.translate(key, params);
  }
}
```

### `frontend/src/app/i18n/language.interceptor.ts`

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Interceptor HTTP que adiciona o header de idioma em todas as requisições
 */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const i18n = inject(I18nService);
  const language = i18n.getLanguageForBackend();

  // Adiciona header X-Language para o backend
  const clonedReq = req.clone({
    setHeaders: {
      'X-Language': language,
      'Accept-Language': language === 'pt' ? 'pt-BR' : 'en-US'
    }
  });

  return next(clonedReq);
};
```

### Atualizar `app.config.ts`

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { languageInterceptor } from './i18n/language.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([languageInterceptor])
    )
  ]
};
```

---

## 🎨 Frontend - Seletor de Idioma

### Componente de Seletor de Idioma

Crie `frontend/src/app/components/language-selector/language-selector.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, Language } from '../../i18n/i18n.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="language-selector">
      <button
        class="lang-btn"
        [class.active]="i18n.language() === 'pt'"
        [attr.aria-pressed]="i18n.language() === 'pt'"
        (click)="setLanguage('pt')"
        aria-label="Português"
        title="Português"
      >
        🇧🇷 PT
      </button>
      <button
        class="lang-btn"
        [class.active]="i18n.language() === 'en'"
        [attr.aria-pressed]="i18n.language() === 'en'"
        (click)="setLanguage('en')"
        aria-label="English"
        title="English"
      >
        🇺🇸 EN
      </button>
    </div>
  `,
  styles: [`
    .language-selector {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .lang-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--text-primary);
      padding: 0.4rem 0.8rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .lang-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .lang-btn.active {
      background: var(--accent-color, #DBC27D);
      color: var(--bg-primary, #0A0E27);
      border-color: var(--accent-color, #DBC27D);
    }

    @media (max-width: 768px) {
      .lang-btn {
        padding: 0.3rem 0.6rem;
        font-size: 0.75rem;
      }
    }
  `]
})
export class LanguageSelectorComponent {
  readonly i18n = inject(I18nService);

  setLanguage(lang: Language): void {
    this.i18n.setLanguage(lang);
  }
}
```

### Adicionar ao Header

Atualize `header.component.ts`:

```typescript
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

@Component({
  // ...
  imports: [
    CommonModule,
    LanguageSelectorComponent  // ← Adicionar
  ],
  // ...
})
```

Atualize `header.component.html`:

```html
<!-- Adicionar antes ou depois dos social links -->
<div class="nav-language desktop-only">
  <app-language-selector></app-language-selector>
</div>

<!-- No menu mobile também -->
<div class="mobile-language">
  <app-language-selector></app-language-selector>
</div>
```

---

## 🔄 Frontend - Modificação dos Componentes

### Exemplo: Hero Component

**Antes:**

```html
<p class="hero-greeting">Olá, eu sou</p>
<h1 class="hero-name"><span class="text-accent">Wesley</span> de Carvalho Augusto Correia</h1>
```

**Depois (habilite `ChangeDetectionStrategy.OnPush` e aproveite `@if/@for` se houver condicionais/listas):**

```html
<p class="hero-greeting">{{ 'hero.greeting' | translate }}</p>
<h1 class="hero-name"><span class="text-accent">Wesley</span> de Carvalho Augusto Correia</h1>
```

**No TypeScript:**

```typescript
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CvModalComponent, TranslatePipe],  // ← Adicionar TranslatePipe
  // ...
})
export class HeroComponent {
  private readonly i18n = inject(I18nService);
  fullText = '';

  constructor() {
    effect(() => {
      this.fullText = this.i18n.translate('hero.title');
    });
  }
}
```

### Exemplo: About Component

```typescript
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/i18n.pipe';

@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  // ...
})
export class AboutComponent {
  private readonly i18n = inject(I18nService);
  
  readonly personalInfo = computed(() => ({
    name: this.i18n.translate('about.name'),
    title: this.i18n.translate('about.titleRole'),
    // ...
  }));

  readonly highlights = computed(() => [
    {
      icon: '💼',
      title: this.i18n.translate('about.highlights.experience.title'),
      value: this.i18n.translate('about.highlights.experience.value')
    },
    // ...
  ]);
}
```

---

## 🔧 Backend - Suporte a Múltiplos Idiomas

### 1. Criar DTO para Idioma

`backend/src/main/java/com/wmakeouthill/portfolio/application/dto/LanguageDto.java`:

```java
package com.wmakeouthill.portfolio.application.dto;

public enum LanguageDto {
    PT("pt", "pt-BR"),
    EN("en", "en-US");

    private final String code;
    private final String locale;

    LanguageDto(String code, String locale) {
        this.code = code;
        this.locale = locale;
    }

    public String getCode() {
        return code;
    }

    public String getLocale() {
        return locale;
    }

    public static LanguageDto fromString(String code) {
        if (code == null || code.isBlank()) {
            return PT; // Padrão: português
        }
        String normalized = code.toLowerCase().trim();
        if (normalized.startsWith("en")) {
            return EN;
        }
        return PT;
    }
}
```

### 2. Utilitário para Extrair Idioma

`backend/src/main/java/com/wmakeouthill/portfolio/infrastructure/utils/LanguageExtractor.java`:

```java
package com.wmakeouthill.portfolio.infrastructure.utils;

import com.wmakeouthill.portfolio.application.dto.LanguageDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class LanguageExtractor {
    private static final String HEADER_X_LANGUAGE = "X-Language";
    private static final String HEADER_ACCEPT_LANGUAGE = "Accept-Language";

    /**
     * Extrai o idioma da requisição HTTP.
     * Prioridade: X-Language > Accept-Language > PT (padrão)
     */
    public LanguageDto extractLanguage(HttpServletRequest request) {
        // 1. Tenta header customizado X-Language
        String xLanguage = request.getHeader(HEADER_X_LANGUAGE);
        if (xLanguage != null && !xLanguage.isBlank()) {
            return LanguageDto.fromString(xLanguage);
        }

        // 2. Tenta Accept-Language
        String acceptLanguage = request.getHeader(HEADER_ACCEPT_LANGUAGE);
        if (acceptLanguage != null && !acceptLanguage.isBlank()) {
            return LanguageDto.fromString(acceptLanguage);
        }

        // 3. Padrão: português
        return LanguageDto.PT;
    }
}
```

---

## 🤖 Backend - Modificação do Chat

### 1. Atualizar PortfolioPromptService

Adicione método para obter prompt baseado no idioma. Monte `BASE_SYSTEM_PROMPT_EN` com o conteúdo completo (sem trechos truncados) espelhando o prompt em português e remova comentários antes de subir:

```java
// No PortfolioPromptService.java

private static final String BASE_SYSTEM_PROMPT_EN = """
    You are the official AI of Brazilian developer Wesley Correia's portfolio (GitHub user "wmakeouthill").
    Your goal is to help recruiters and interested people quickly understand who Wesley is,
    his experience, stack, main projects, and way of working.

    CONTEXT ABOUT WESLEY (SUMMARY):
    - Name: Wesley Correia (wmakeouthill)
    - Works as Fullstack Developer Intern at ANBIMA/Selic ↔ Central Bank partnership, modernizing the Selic system (COBOL → Java/Spring) and building Angular interfaces monitored by Prometheus/Grafana.
    - Previous experience: Projects/Governance Intern at the same institution, focusing on executive reports and SharePoint/Power BI automations.
    - Profile: curious, focused on continuous learning, and always with a new project in mind.

    TECH STACK (CURRENT FOCUS):
    - Backend: Java, Spring, Spring Boot, Liquibase, Maven, Lombok, MySQL, SQL.
    - Frontend: Angular (17+ and 18), TypeScript, RxJS, HTML5, CSS3, JavaScript.
    - DevOps/CI/CD: Docker, Docker Compose, Google Cloud Run, Cloud Build, CI/CD Pipelines, NGINX, Kubernetes.
    - Others: Python, Power BI, Selenium, Git, OpenAI.

    HOW TO RESPOND:
    - Always write in English, with a professional, clear, and direct tone.
    - Focus on helping recruiters understand technologies, project types, and how Wesley thinks about architecture, code quality, and UX.
    - Give concrete examples by citing the projects above when it makes sense.

    PRINCIPLES:
    - Be concise, factual, and helpful to recruiters.
    - Do not invent projects or roles; use only the provided context.
    """;

/**
 * Obtém o system prompt no idioma especificado.
 */
public String obterSystemPromptPorIdioma(String mensagemUsuario, LanguageDto language) {
    String basePrompt = language == LanguageDto.EN 
        ? BASE_SYSTEM_PROMPT_EN 
        : BASE_SYSTEM_PROMPT;
    
    StringBuilder builder = new StringBuilder(basePrompt);
    anexarContextoRelevante(builder, mensagemUsuario);
    anexarProjetos(builder, mensagemUsuario);
    return builder.toString();
}
```

### 2. Atualizar ChatUseCase

```java
// No ChatUseCase.java

private final LanguageExtractor languageExtractor; // Injetar

public ChatResponse execute(ChatRequest request, String sessionId, LanguageDto language) {
    // ... código existente ...
    
    // Carrega system prompt no idioma correto
    String systemPrompt = portfolioPromptService.obterSystemPromptPorIdioma(
        mensagemUsuarioTexto, 
        language
    );
    
    // ... resto do código ...
}
```

### 3. Atualizar ChatController

```java
// No ChatController.java

private final LanguageExtractor languageExtractor; // Injetar

@PostMapping
public ResponseEntity<ChatResponse> chat(
        @Valid @RequestBody ChatRequest request,
        HttpServletRequest httpRequest) {
    try {
        String sessionId = extrairSessionId(httpRequest);
        LanguageDto language = languageExtractor.extractLanguage(httpRequest);
        ChatResponse response = chatUseCase.execute(request, sessionId, language);
        return ResponseEntity.ok(response);
    } catch (Exception e) {
        // ... tratamento de erro ...
    }
}
```

---

## 💾 Persistência da Preferência do Usuário

O serviço `I18nService` já persiste automaticamente no `localStorage`. O idioma é:

1. **Carregado** do `localStorage` na inicialização
2. **Salvo** automaticamente quando muda (via `effect`)
3. **Detectado** do navegador se não houver preferência salva

---

## ✅ Boas Práticas Obrigatórias (alinhadas ao `.cursorrules`)

- Habilitar `ChangeDetectionStrategy.OnPush` em componentes tocados (LanguageSelector, Hero, About, Contact, Header, Chat, Footer e outros ajustados).
- Usar `inject()` no Angular em vez de construtor para dependências; manter componentes standalone.
- Preferir sintaxe moderna de template (`@if`, `@for`) quando houver condicionais/listas ao refatorar componentes.
- Garantir acessibilidade no seletor de idioma (`aria-pressed`, rótulos claros) e nos inputs traduzidos.
- Backend: usar `@RequiredArgsConstructor` nos beans (controller/use case/service) e manter o enum/utilitário em conformidade com a clean architecture.

---

## ✅ Checklist de Implementação

### Frontend

- [ ] Criar `src/assets/i18n/` com `pt.json` e `en.json` completos
- [ ] Implementar `I18nService` e `TranslatePipe` com cache e fallback básico
- [ ] Implementar `languageInterceptor` e registrar no `app.config.ts`
- [ ] Criar `LanguageSelectorComponent` com `OnPush`, `aria-pressed` e inserir no Header (desktop/mobile)
- [ ] Converter Hero/About/Header/Contact/Chat/Footer para `translate` e, quando houver condicionais/listas, usar `@if/@for`
- [ ] Aplicar `ChangeDetectionStrategy.OnPush` nos componentes tocados
- [ ] Testar mudança de idioma e persistência no `localStorage`

### Backend

- [ ] Criar `LanguageDto` enum
- [ ] Criar `LanguageExtractor` utility
- [ ] Criar `BASE_SYSTEM_PROMPT_EN` completo (paridade com PT) em `PortfolioPromptService`
- [ ] Adicionar método `obterSystemPromptPorIdioma()`
- [ ] Atualizar `ChatUseCase` para receber `LanguageDto` e injeção via `@RequiredArgsConstructor`
- [ ] Atualizar `ChatController` para extrair idioma e propagar
- [ ] Testar chat em português
- [ ] Testar chat em inglês
- [ ] Verificar se header `X-Language` está sendo enviado

### Testes

- [ ] Testar mudança de idioma no frontend
- [ ] Testar persistência após refresh
- [ ] Testar chat respondendo em português
- [ ] Testar chat respondendo em inglês
- [ ] Testar detecção automática do idioma do navegador
- [ ] Testar em diferentes navegadores

---

## 🚦 Plano de Execução Segura (passos curtos)

1) **Base i18n no frontend**: criar `src/assets/i18n/` com pt/en; adicionar `i18n.service.ts`, `i18n.pipe.ts`, `language.interceptor.ts` e registrar no `app.config.ts`.
2) **Seletor + header**: criar `LanguageSelectorComponent` com `OnPush` e `aria-pressed`; encaixar no header desktop/mobile e validar headers em network tab.
3) **Componentes-chave**: converter Hero/About/Header/Contact/Chat/Footer para `translate` (e `@if/@for` quando houver condicionais); aplicar `OnPush` nos tocados.
4) **Backend idioma**: incluir `LanguageDto`, `LanguageExtractor`, `obterSystemPromptPorIdioma`, completar `BASE_SYSTEM_PROMPT_EN` (paridade PT) e propagar idioma em `ChatUseCase`/`ChatController` com `@RequiredArgsConstructor`.
5) **Testes rápidos**: trocar idioma, recarregar e checar persistência; inspecionar `X-Language`/`Accept-Language`; acionar chat e validar resposta em PT/EN.
6) **Ajustes finais**: tratar chaves ausentes com fallback, revisar copy, limpar warnings de tradução e logs supérfluos.

---

## 📝 Exemplos Práticos

### Exemplo 1: Componente Simples com Tradução

```typescript
// footer.component.ts
import { Component } from '@angular/core';
import { TranslatePipe } from '../../i18n/i18n.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <footer>
      <p>{{ 'footer.rights' | translate }}</p>
      <p>
        {{ 'footer.builtWith' | translate }} 
        Angular {{ 'footer.and' | translate }} Spring Boot
      </p>
    </footer>
  `
})
export class FooterComponent {}
```

### Exemplo 2: Componente com Traduções Dinâmicas

```typescript
// contact.component.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/i18n.pipe';

@Component({
  selector: 'app-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  template: `
    <section>
      <h2>{{ 'contact.title' | translate }}</h2>
      <p>{{ 'contact.subtitle' | translate }}</p>
      
      <form>
        <input 
          [placeholder]="'contact.namePlaceholder' | translate"
          [attr.aria-label]="'contact.name' | translate"
        />
        <button>{{ 'contact.send' | translate }}</button>
      </form>
    </section>
  `
})
export class ContactComponent {
  private readonly i18n = inject(I18nService);
  
  // Exemplo de uso programático
  getSuccessMessage(): string {
    return this.i18n.translate('contact.success');
  }
}
```

### Exemplo 3: Tradução com Parâmetros

```json
// pt.json
{
  "projects": {
    "projectCount": "Você tem {count} projetos"
  }
}
```

```typescript
// projects.component.ts
template: `
  <p>{{ 'projects.projectCount' | translate: { count: projects().length } }}</p>
`
```

---

## 🚀 Próximos Passos

1. **Implementar gradualmente**: Comece pelos componentes principais (Hero, Header, About)
2. **Testar constantemente**: Mude o idioma e verifique se tudo está traduzido
3. **Expandir traduções**: Adicione mais chaves conforme necessário
4. **Otimizar**: Considere lazy loading de traduções se o arquivo ficar muito grande
5. **Melhorar UX**: Adicione animação suave na transição de idioma

---

## 📚 Recursos Adicionais

- [Angular i18n Guide](https://angular.io/guide/i18n)
- [MDN: Accept-Language Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language)
- [LocalStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

**Documento criado em:** 2024  
**Versão:** 1.0  
**Autor:** Sistema de Documentação Automática
