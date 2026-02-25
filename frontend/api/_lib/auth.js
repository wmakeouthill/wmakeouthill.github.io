/**
 * Módulo compartilhado de autenticação e proxy para a API no Vercel.
 * Anteriormente apontava para Cloud Run, agora aponta para Oracle Cloud.
 */

const TARGET_API_URL = process.env.API_BASE_URL || 'http://137.131.158.76:8080';
const API_KEY = process.env.API_KEY || '';

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-Language, Accept-Language, X-API-Key');
}

async function proxyRequest(req, res, targetPath) {
    try {
        const fullTargetUrl = `${TARGET_API_URL}${targetPath}`;

        console.log(`[Proxy] ${req.method} ${fullTargetUrl}`);

        // O backend Oracle exige este header assinado para permitir entrada
        const headers = { 'X-API-Key': API_KEY };

        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }
        if (req.headers['x-session-id']) {
            headers['X-Session-Id'] = req.headers['x-session-id'];
        }
        // Passar headers de idioma para o backend
        if (req.headers['x-language']) {
            headers['X-Language'] = req.headers['x-language'];
        }
        if (req.headers['accept-language']) {
            headers['Accept-Language'] = req.headers['accept-language'];
        }

        const fetchOptions = { method: req.method, headers };

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(fullTargetUrl, fetchOptions);
        const contentType = response.headers.get('content-type') || '';

        if (contentType.startsWith('image/') || contentType.startsWith('application/pdf')) {
            const buffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
            const cacheControl = response.headers.get('cache-control');
            if (cacheControl) res.setHeader('Cache-Control', cacheControl);
            return res.status(response.status).send(Buffer.from(buffer));
        }

        const responseData = await response.text();
        if (contentType) res.setHeader('Content-Type', contentType);
        res.status(response.status);

        try {
            return res.json(JSON.parse(responseData));
        } catch {
            return res.send(responseData);
        }

    } catch (error) {
        console.error('[Proxy Error]', error);
        return res.status(500).json({
            error: 'Erro no proxy para o backend',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { setCorsHeaders, proxyRequest, TARGET_API_URL };
