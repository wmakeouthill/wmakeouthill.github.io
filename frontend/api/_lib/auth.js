/**
 * Módulo compartilhado de autenticação para Cloud Run
 */

const { GoogleAuth } = require('google-auth-library');

const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL || 'https://projeto-wesley-hqb7iuff7a-rj.a.run.app';

let tokenCache = { token: null, expiry: 0 };

async function getIdToken() {
    const now = Date.now();

    if (tokenCache.token && tokenCache.expiry > now + 300000) {
        return tokenCache.token;
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');

    if (!credentials.client_email) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurada ou inválida');
    }

    const auth = new GoogleAuth({ credentials });
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    const headers = await client.getRequestHeaders();

    const token = headers.Authorization?.replace('Bearer ', '');

    tokenCache = { token, expiry: now + 3600000 };
    return token;
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-Language, Accept-Language');
}

async function proxyRequest(req, res, targetPath) {
    try {
        const idToken = await getIdToken();
        const fullTargetUrl = `${CLOUD_RUN_URL}${targetPath}`;

        console.log(`[Proxy] ${req.method} ${fullTargetUrl}`);

        const headers = { 'Authorization': `Bearer ${idToken}` };

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
            error: 'Erro no proxy',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { getIdToken, setCorsHeaders, proxyRequest, CLOUD_RUN_URL };
