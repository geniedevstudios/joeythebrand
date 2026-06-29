const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let key, secret, account;
env.split('\n').forEach(line => {
  if (line.startsWith('DHL_API_KEY=')) key = line.split('=')[1].trim();
  if (line.startsWith('DHL_API_SECRET=')) secret = line.split('=')[1].trim().replace(/^"|"$/g, '');
  if (line.startsWith('DHL_ACCOUNT_NUMBER=')) account = line.split('=')[1].trim();
});
const authHeader = `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
console.log('Secret loaded:', secret);
const https = require('https');

const payload = {
  customerDetails: {
    shipperDetails: {
      postalCode: "00233",
      cityName: "Accra",
      countryCode: "GH",
      addressLine1: "Nii KWAOFIO ST ASHALEY BOTWE"
    },
    receiverDetails: {
      postalCode: "90210",
      cityName: "Beverly Hills",
      countryCode: "US"
    }
  },
  accounts: [{ typeCode: "shipper", number: account }],
  productCode: "P",
  plannedShippingDateAndTime: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] + "T12:00:00 GMT+00:00",
  unitOfMeasurement: "metric",
  isCustomsDeclarable: true,
  monetaryAmount: [
    { typeCode: "declaredValue", value: 100, currency: "GHS" }
  ],
  packages: [
    {
      weight: 1.0,
      dimensions: { length: 30, width: 20, height: 10 }
    }
  ]
};

const req = https.request('https://express.api.dhl.com/mydhlapi/test/rates', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
    'Connection': 'close'
  }
}, (res) => {
  console.log('Status Code:', res.statusCode);
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(JSON.stringify(payload));
req.end();
