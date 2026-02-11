const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
require('dotenv').config(); // Load .env file if present

const PORT = process.env.PORT || 3000;
const TELEGRAM_API_BASE = 'api.telegram.org';

const MIMETYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Parse URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // --- PROXY ENDPOINT FOR TELEGRAM ---
    // Usage: /telegram-proxy/<METHOD>?<QUERY>
    // Token is injected server-side for security
    if (pathname.startsWith('/telegram-proxy/')) {
        const method = pathname.replace('/telegram-proxy/', '');
        const query = parsedUrl.search || ''; // includes '?'
        
        // Load token from environment variable
        const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8594588884:AAF1ODTlOEYhDIKgILpadiPlcgfCm_aZEAA';

        if (!TELEGRAM_TOKEN) {
            console.error('ERROR: TELEGRAM_TOKEN environment variable is not set.');
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Server misconfiguration: Token missing' }));
            return;
        }

        const telegramPath = `/bot${TELEGRAM_TOKEN}/${method}`;
        
        const options = {
            hostname: TELEGRAM_API_BASE,
            port: 443,
            path: telegramPath + query,
            method: req.method,
            headers: {
                ...req.headers,
                host: TELEGRAM_API_BASE // Override host header
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (e) => {
            console.error(`Proxy Error: ${e.message}`);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Proxy Error', details: e.message }));
        });

        // Pipe request body (for POST)
        req.pipe(proxyReq);
        return;
    }

    // --- STATIC FILE SERVING ---
    let filePath = '.' + pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = path.extname(filePath);
    const contentType = MIMETYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.readFile('./404.html', (err, content404) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content404 || '404 Not Found', 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`\n⚠️  El puerto ${PORT} ya está en uso.`);
        console.log(`Esto significa que el servidor ya está corriendo en otra ventana.`);
        console.log(`Puedes cerrar esta ventana o usar la que ya está abierta.\n`);
        process.exit(0);
    } else {
        console.error('Error del servidor:', e);
    }
});

server.listen(PORT, () => {
    console.log(`\n✅ Servidor corriendo en el puerto ${PORT}`);
    console.log(`📍 Proxy de Telegram activo en: http://localhost:${PORT}/telegram-proxy/`);
    
    // DEBUG: Diagnóstico de Variables de Entorno
    console.log("--- DIAGNÓSTICO DE ARRANQUE ---");
    if (process.env.TELEGRAM_TOKEN) {
        const tokenLen = process.env.TELEGRAM_TOKEN.length;
        console.log(`✅ TELEGRAM_TOKEN detectado correctamente (Longitud: ${tokenLen})`);
        console.log(`🔑 Primeros 3 caracteres: ${process.env.TELEGRAM_TOKEN.substring(0,3)}...`);
    } else {
        console.log("❌ ERROR CRÍTICO: TELEGRAM_TOKEN NO DETECTADO");
        console.log("🔍 Variables disponibles en el sistema:");
        console.log(Object.keys(process.env).join(", "));
    }
    console.log("-------------------------------");
});
