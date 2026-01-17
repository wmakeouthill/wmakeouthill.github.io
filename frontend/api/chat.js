/**
 * POST /api/chat - Enviar mensagem
 * POST /api/chat/clear - Limpar histórico
 */

const { setCorsHeaders, proxyRequest } = require('./_lib/auth');

module.exports = async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    let targetPath = url.pathname;
    const queryString = url.search;
    if (queryString) {
        targetPath += queryString;
    }

    return proxyRequest(req, res, targetPath);
};
