console.log('Start');
try {
  const puppeteer = require('puppeteer-core');
  console.log('Puppeteer Core required');
} catch (e) {
  console.error('Error requiring puppeteer-core:', e);
}
console.log('End');
