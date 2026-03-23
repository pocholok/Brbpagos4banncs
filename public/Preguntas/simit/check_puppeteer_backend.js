const http = require('http');

function testBackend() {
    console.log('Script Start');
    console.log('Testing backend Puppeteer integration...');
    
    const query = '1045524940';
    const postData = JSON.stringify({ query });

    const options = {
        hostname: '127.0.0.1', // Use IP to avoid localhost issues
        port: 3004,
        path: '/api/consultar',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000 // 30 seconds timeout
    };

    const startTime = Date.now();
    console.log('Sending request...');
    
    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            const duration = (Date.now() - startTime) / 1000;
            console.log(`Request took ${duration} seconds`);
            console.log('BODY:', data.substring(0, 200) + '...');
            console.log('Script End');
        });
    });

    req.on('timeout', () => {
        console.error('Request timed out');
        req.destroy();
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
        console.log('Script End');
    });

    // Write data to request body
    req.write(postData);
    req.end();
}

testBackend();
