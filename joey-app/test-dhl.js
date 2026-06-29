const https = require('https');

const req = https.request('https://express.api.dhl.com/mydhlapi/test/rates', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Message-Reference': '12345678901234567890123456789012'
  }
}, (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(JSON.stringify({}));
req.end();
