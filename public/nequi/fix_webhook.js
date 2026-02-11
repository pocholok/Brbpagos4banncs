const https = require('https');

const TOKEN = '8164357624:AAF6-huSZNt6tU0Y-bOjkfac83GPh0gihJA';

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

console.log("Eliminando Webhook...");
request('deleteWebhook');
