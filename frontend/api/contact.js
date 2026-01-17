/**
 * POST /api/contact - Enviar formulário de contato
 */

const { setCorsHeaders, proxyRequest } = require('./_lib/auth');

module.exports = async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    return proxyRequest(req, res, '/api/contact');
};
