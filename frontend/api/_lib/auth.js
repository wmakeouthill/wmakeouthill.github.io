/**
 * Módulo compartilhado de autenticação e proxy para a API no Vercel.
 * Anteriormente apontava para Cloud Run, agora aponta para Oracle Cloud.
 */

const TARGET_API_URL = process.env.API_BASE_URL || 'http://137.131.158.76:8080';
const API_KEY = process.env.API_KEY || '';

// Aborta o fetch ao backend pouco antes do maxDuration da função (60s no plano
// Hobby da Vercel), devolvendo um 504 com corpo legível em vez do 504 opaco da
// plataforma. 58s deixa ~2s para a função serializar a resposta antes do kill.
const BACKEND_TIMEOUT_MS = 58000;

/** Executa um fetch com timeout via AbortController. */
async function fetchWithTimeout(url, options = {}, timeoutMs = BACKEND_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-Language, Accept-Language, X-API-Key, If-None-Match');
    res.setHeader('Access-Control-Expose-Headers', 'ETag');
}

/**
 * Repassa os headers de cache/validação do backend para o browser, preservando
 * a semântica de ETag (revalidação condicional) de ponta a ponta.
 */
function forwardCacheHeaders(backendResponse, res) {
    for (const header of ['etag', 'cache-control', 'vary', 'last-modified']) {
        const value = backendResponse.headers.get(header);
        if (value) {
            res.setHeader(header, value);
        }
    }
}

async function proxyRequest(req, res, targetPath) {
    try {
        const fullTargetUrl = `${TARGET_API_URL}${targetPath}`;

        if (!API_KEY) {
            console.error('[Proxy] API_KEY env var não configurada na Vercel — backend retornará 401');
        }
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
        // Revalidação condicional por ETag: repassa o If-None-Match do browser
        // para o backend, que pode responder 304 Not Modified (sem corpo).
        if (req.headers['if-none-match']) {
            headers['If-None-Match'] = req.headers['if-none-match'];
        }

        const fetchOptions = { method: req.method, headers };

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetchWithTimeout(fullTargetUrl, fetchOptions);

        // Repassa headers de cache/validação do backend para o browser, para que
        // o cache HTTP do navegador funcione de ponta a ponta (ETag + revalidação).
        forwardCacheHeaders(response, res);

        // 304 Not Modified: backend confirmou que nada mudou — sem corpo.
        if (response.status === 304) {
            return res.status(304).end();
        }

        const contentType = response.headers.get('content-type') || '';

        if (contentType.startsWith('image/') || contentType.startsWith('application/pdf')) {
            const buffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
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
        if (error.name === 'AbortError') {
            console.error('[Proxy Timeout] backend não respondeu a tempo');
            return res.status(504).json({
                error: 'O servidor demorou demais para responder',
                message: 'A resposta da IA excedeu o tempo limite. Tente novamente.',
                timestamp: new Date().toISOString()
            });
        }
        console.error('[Proxy Error]', error);
        return res.status(500).json({
            error: 'Erro no proxy para o backend',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Lê o corpo bruto (binário) da requisição como Buffer.
 * Necessário para multipart/form-data (uploads), já que o bodyParser do Vercel
 * deve estar desativado na rota que usa este helper.
 */
function readRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

/**
 * Encaminha uma requisição multipart/binária ao backend preservando o corpo
 * bruto (sem JSON.stringify) e o Content-Type com boundary.
 */
async function proxyRawRequest(req, res, targetPath) {
    try {
        const fullTargetUrl = `${TARGET_API_URL}${targetPath}`;
        if (!API_KEY) {
            console.error('[Proxy] API_KEY env var não configurada na Vercel — backend retornará 401');
        }
        console.log(`[Proxy raw] ${req.method} ${fullTargetUrl}`);

        const headers = { 'X-API-Key': API_KEY };
        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }
        if (req.headers['x-session-id']) {
            headers['X-Session-Id'] = req.headers['x-session-id'];
        }
        if (req.headers['x-language']) {
            headers['X-Language'] = req.headers['x-language'];
        }
        if (req.headers['accept-language']) {
            headers['Accept-Language'] = req.headers['accept-language'];
        }

        const body = await readRawBody(req);
        const response = await fetchWithTimeout(fullTargetUrl, { method: req.method, headers, body });
        const contentType = response.headers.get('content-type') || '';

        if (contentType.startsWith('image/') || contentType.startsWith('application/pdf')
            || contentType.startsWith('audio/')) {
            const buffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
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
        if (error.name === 'AbortError') {
            console.error('[Proxy raw Timeout] backend não respondeu a tempo');
            return res.status(504).json({
                error: 'O servidor demorou demais para responder',
                message: 'A resposta da IA excedeu o tempo limite. Tente novamente.',
                timestamp: new Date().toISOString()
            });
        }
        console.error('[Proxy raw Error]', error);
        return res.status(500).json({
            error: 'Erro no proxy para o backend',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { setCorsHeaders, proxyRequest, proxyRawRequest, TARGET_API_URL };
