/**
 * GET /api/health - Health check do backend
 * Usado pelo docs/index.html para verificar se o backend está pronto
 */

const { setCorsHeaders, proxyRequest } = require('./_lib/auth');

module.exports = async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Usa o endpoint de cache/status como health check
    return proxyRequest(req, res, '/api/cache/status');
};
