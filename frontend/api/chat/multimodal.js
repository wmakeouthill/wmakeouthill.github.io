/**
 * POST /api/chat/multimodal - Enviar mensagem com anexos (multipart/form-data).
 *
 * Encaminha o corpo bruto ao backend preservando o boundary do multipart.
 * O bodyParser do Vercel é desativado abaixo para não corromper o upload.
 */

const { setCorsHeaders, proxyRawRequest } = require('../_lib/auth');

const handler = async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    let targetPath = url.pathname;
    if (url.search) {
        targetPath += url.search;
    }

    return proxyRawRequest(req, res, targetPath);
};

handler.config = { api: { bodyParser: false } };

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
