const https = require('https');

const TOKEN = '8594588884:AAFq6nlhKzJL8Ahdhe2P0B-8ThQkIwvCEpM';

function request(method) {
    const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`Response for ${method}:`);
            console.log(data);
        });
    }).on('error', (e) => {
        console.error(`Error calling ${method}:`, e);
    });
}

// Verificar Webhook
request('getWebhookInfo');

// Probar getUpdates manualmente
request('getUpdates?limit=1');
