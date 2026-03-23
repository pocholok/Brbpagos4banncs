const express = require('express');
// const puppeteer = require('puppeteer');
const app = express();
const PORT = 3002;

app.get('/', (req, res) => res.send('Hello'));

app.listen(PORT, () => {
    console.log(`Simple server running on ${PORT}`);
    setInterval(() => console.log('Ping'), 5000);
});
