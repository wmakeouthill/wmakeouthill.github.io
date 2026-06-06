const { proxyRequest } = require('./_lib/auth');

let reqHandlerPromise;

function getReqHandler() {
    reqHandlerPromise ??= import('../dist/portfolio/server/server.mjs').then(
        (module) => module.reqHandler,
    );
    return reqHandlerPromise;
}

module.exports = async function ssr(req, res) {
    const backendPath = getAllowedBackendPath(req);
    if (backendPath) {
        return proxyRequest(req, res, backendPath);
    }

    const restoreUrl = rewriteRequestUrl(req);

    try {
        const reqHandler = await getReqHandler();
        return reqHandler(req, res);
    } catch (error) {
        console.error('[SSR] render failed', error);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
    } finally {
        restoreUrl();
    }
};

function rewriteRequestUrl(req) {
    const originalUrl = req.url || '/';
    const parsedUrl = new URL(originalUrl, 'http://localhost');
    const ssrPath = getFirstQueryValue(req.query?.__ssrPath) ?? parsedUrl.searchParams.get('__ssrPath');

    if (!ssrPath || !isAllowedSsrPath(ssrPath)) {
        return () => {
            req.url = originalUrl;
        };
    }

    parsedUrl.searchParams.delete('__ssrPath');
    const search = parsedUrl.searchParams.toString();
    req.url = `${ssrPath}${search ? `?${search}` : ''}`;

    return () => {
        req.url = originalUrl;
    };
}

function getFirstQueryValue(value) {
    if (Array.isArray(value)) {
        return value[0];
    }
    return typeof value === 'string' ? value : null;
}

function isAllowedSsrPath(path) {
    return /^\/(?:|en|projects|projects\/[^/?#]+|en\/projects|en\/projects\/[^/?#]+)\/?$/.test(path);
}

function getAllowedBackendPath(req) {
    const originalUrl = req.url || '/';
    const parsedUrl = new URL(originalUrl, 'http://localhost');
    const backendPath = getFirstQueryValue(req.query?.__backendPath) ?? parsedUrl.searchParams.get('__backendPath');

    if (backendPath === '/sitemap.xml' || backendPath === '/robots.txt') {
        return backendPath;
    }

    return null;
}
