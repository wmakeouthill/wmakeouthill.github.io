/**
 * POST /api/chat/email - Reescreve e envia email pelo backend.
 */

const { setCorsHeaders, proxyRequest } = require('../_lib/auth');

module.exports = async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    return proxyRequest(req, res, '/api/chat/email');
};
