fetch('http://localhost:3004')
  .then(r => r.text())
  .then(t => console.log('Response:', t.substring(0, 50)))
  .catch(e => console.error('Error:', e.message));
