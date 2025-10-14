#!/bin/bash

# Script de deploy para GitHub Pages
echo "🚀 Iniciando deploy para GitHub Pages..."

# Entrar no diretório do projeto Angular
cd portfolio

# Build da aplicação
echo "📦 Fazendo build da aplicação..."
ng build --configuration production

# Verificar se o build foi bem-sucedido
if [ $? -ne 0 ]; then
    echo "❌ Erro no build. Abortando deploy."
    exit 1
fi

# Voltar para a raiz
cd ..

# Criar diretório docs se não existir
mkdir -p docs

# Copiar arquivos do dist para docs
echo "📂 Copiando arquivos para docs/..."
cp -r portfolio/dist/portfolio/browser/* docs/

# Criar arquivo .nojekyll para GitHub Pages
touch docs/.nojekyll

# Adicionar CNAME se necessário (descomente se usar domínio customizado)
# echo "seu-dominio.com" > docs/CNAME

echo "✅ Deploy preparado! Arquivos estão em docs/"
echo "📝 Para publicar:"
echo "   1. Faça commit dos arquivos em docs/"
echo "   2. Push para o branch main"
echo "   3. No GitHub: Settings > Pages > Source: Deploy from a branch > Branch: main > Folder: /docs"
echo ""
echo "🌐 Seu portfólio estará disponível em: https://wmakeouthill.github.io"