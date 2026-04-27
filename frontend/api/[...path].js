/**
 * Vercel Serverless Function - Proxy catch-all para /api/*
 * Encaminha para o backend Oracle Cloud via X-API-Key (sem Google Auth).
 */

const { proxyRequest } = require('./_lib/auth');

const ALLOWED_ORIGINS = [
    'https://wmakeouthill.github.io',
    'https://wmakeouthill.dev',
    'https://www.wmakeouthill.dev',
    'http://localhost:4200',
    'http://localhost:8080'
];

function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-Language, Accept-Language, X-API-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const pathSegments = req.query.path;
    let apiPath = '/api';
    if (Array.isArray(pathSegments)) {
        apiPath += '/' + pathSegments.join('/');
    } else if (pathSegments) {
        apiPath += '/' + pathSegments;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryParams = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
        if (key !== 'path') {
            queryParams.append(key, value);
        }
    }
    const queryString = queryParams.toString();
    const targetPath = `${apiPath}${queryString ? '?' + queryString : ''}`;

    return proxyRequest(req, res, targetPath);
};
