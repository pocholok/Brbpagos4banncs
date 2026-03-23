
const http = require('http');
const fs = require('fs');

const query = '1045524940'; // Example ID
const postData = JSON.stringify({ query });

const options = {
  hostname: 'localhost',
  port: 3004,
  path: '/api/consultar',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending request...');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response received.');
    fs.writeFileSync('response_dump.json', data);
    console.log('Dumped to response_dump.json');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
