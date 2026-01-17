/**
 * GET /api/health - Health check do backend
 * Usado pelo docs/index.html para verificar se o backend está pronto
 */

const { proxyRequest } = require('./_lib/auth');

// Origens permitidas para CORS
const ALLOWED_ORIGINS = [
    'https://wmakeouthill.github.io',
    'https://wmakeouthill.dev',
    'https://www.wmakeouthill.dev',
    'http://localhost:4200',
    'http://localhost:8080'
];

function setCorsHeadersForHealth(req, res) {
    const origin = req.headers.origin;

    // Se a origem está na lista permitida, usa ela; senão usa a primeira
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = async (req, res) => {
    setCorsHeadersForHealth(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Usa o endpoint de cache/status como health check
    return proxyRequest(req, res, '/api/cache/status');
};
