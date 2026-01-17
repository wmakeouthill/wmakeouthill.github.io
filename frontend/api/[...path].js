/**
 * Vercel Serverless Function - Proxy Universal para todas as rotas /api/*
 * Um único handler que roteia TODAS as requisições para o Cloud Run
 */

const { GoogleAuth } = require('google-auth-library');

// URL do backend no Cloud Run
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL || 'https://projeto-wesley-hqb7iuff7a-rj.a.run.app';

// Cache do token
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

    tokenCache = {
        token,
        expiry: now + 3600000
    };

    return token;
}

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-Language, Accept-Language');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const idToken = await getIdToken();

        // Extrair o path completo da URL
        // req.query.path contém os segmentos após /api/
        const pathSegments = req.query.path;
        let apiPath = '/api';

        if (Array.isArray(pathSegments)) {
            apiPath += '/' + pathSegments.join('/');
        } else if (pathSegments) {
            apiPath += '/' + pathSegments;
        }

        // Preservar query params originais (exceto 'path' que é do Vercel)
        const url = new URL(req.url, `http://${req.headers.host}`);
        const queryParams = new URLSearchParams();
        for (const [key, value] of url.searchParams) {
            if (key !== 'path') {
                queryParams.append(key, value);
            }
        }
        const queryString = queryParams.toString();
        const fullTargetUrl = `${CLOUD_RUN_URL}${apiPath}${queryString ? '?' + queryString : ''}`;

        console.log(`[API Proxy] ${req.method} ${fullTargetUrl}`);

        const headers = {
            'Authorization': `Bearer ${idToken}`,
        };

        // Propagar headers importantes
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

        const fetchOptions = {
            method: req.method,
            headers,
        };

        // Adicionar body se não for GET/HEAD
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(fullTargetUrl, fetchOptions);

        // Determinar tipo de conteúdo
        const contentType = response.headers.get('content-type') || '';

        // Para binários (imagens, PDFs, etc), retornar buffer
        if (contentType.startsWith('image/') || contentType.startsWith('application/pdf')) {
            const buffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
            const cacheControl = response.headers.get('cache-control');
            if (cacheControl) {
                res.setHeader('Cache-Control', cacheControl);
            }
            return res.status(response.status).send(Buffer.from(buffer));
        }

        // Para texto/JSON
        const responseData = await response.text();

        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        res.status(response.status);

        try {
            return res.json(JSON.parse(responseData));
        } catch {
            return res.send(responseData);
        }

    } catch (error) {
        console.error('[API Proxy Error]', error);
        return res.status(500).json({
            error: 'Erro no proxy',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
