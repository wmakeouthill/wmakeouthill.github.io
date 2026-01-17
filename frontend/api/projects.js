/**
 * GET /api/projects - Lista projetos
 * GET /api/projects/:name - Detalhes do projeto
 * GET /api/projects/:name/markdown - Markdown do projeto
 * GET /api/projects/:name/languages - Linguagens do projeto
 * GET /api/projects/:name/tree - Árvore de arquivos
 * GET /api/projects/:name/contents - Conteúdo de arquivo
 */

const { setCorsHeaders, proxyRequest } = require('./_lib/auth');

module.exports = async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Extrair path da URL original
    const url = new URL(req.url, `http://${req.headers.host}`);
    let targetPath = url.pathname; // já vem como /api/projects/...

    // Preservar query params
    const queryString = url.search;
    if (queryString) {
        targetPath += queryString;
    }

    return proxyRequest(req, res, targetPath);
};
