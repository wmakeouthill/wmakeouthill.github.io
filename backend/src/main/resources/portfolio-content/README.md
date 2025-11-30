# Portfolio Content - Markdown Files

Esta pasta contém os arquivos markdown que são servidos pelo backend para:

1. **Alimentar a IA do chat** - Conteúdos em `portfolio-content/*.md` são carregados automaticamente e incluídos no contexto do sistema da IA
2. **Servir markdowns de projetos** - Arquivos em `portfolio-content/projects/{nome_projeto}.md` são servidos via API REST para o frontend

## Estrutura

```
portfolio-content/
├── README.md (este arquivo)
├── *.md (markdowns gerais para a IA - resumos, informações sobre o portfólio, etc.)
└── projects/
    ├── {nome-projeto}.md (markdowns específicos de cada projeto)
    └── ...
```

## Como funciona

### Markdowns para a IA
- Arquivos `.md` na raiz de `portfolio-content/` são carregados automaticamente
- São incluídos no system prompt da IA quando o chat é inicializado
- Limite de 4000 caracteres por arquivo (para evitar tokens excessivos)

### Markdowns de Projetos
- Arquivos em `portfolio-content/projects/{nome_projeto}.md`
- Servidos via endpoint: `GET /api/projects/{projectName}/markdown`
- O nome do projeto é normalizado (lowercase, trim) antes de buscar o arquivo
- Exemplo: projeto "LoL-Matchmaking-Fazenda" busca `lol-matchmaking-fazenda.md`

## Migração dos Markdowns

Os markdowns foram migrados de `frontend/public/assets/portfolio_md/` para esta pasta no backend, pois:
- Futuramente serão servidos dinamicamente pelo backend
- Permite controle de acesso e cache
- Facilita atualizações sem rebuild do frontend

