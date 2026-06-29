const DHL_API_BASE = 'https://express.api.dhl.com/mydhlapi/test';
const key = 'apQ4nZ4tM9mZ8k';
const secret = 'R#2zG#7hJ@5mO$9h';
const account = '331926594';

function getAuthHeader() {
  return 'Basic ' + Buffer.from(key + ':' + secret).toString('base64');
}

const req = {
  destination: {
    city: 'London',
    postalCode: 'WC2N 5DU',
    countryCode: 'GB'
  },
  weightKg: 1
};

function getNextBusinessDay() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  if (date.getDay() === 0) { // Sunday
    date.setDate(date.getDate() + 1);
  } else if (date.getDay() === 6) { // Saturday
    date.setDate(date.getDate() + 2);
  }
  return date.toISOString().split("T")[0];
}

const plannedShippingDate = getNextBusinessDay();

const payload = {
  customerDetails: {
    shipperDetails: {
      postalCode: '00233',
      cityName: 'Accra',
      countryCode: 'GH',
      addressLine1: 'Nii KWAOFIO ST ASHALEY BOTWE'
    },
    receiverDetails: {
      postalCode: req.destination.postalCode || '',
      cityName: req.destination.city,
      countryCode: req.destination.countryCode
    }
  },
  accounts: [{ typeCode: 'shipper', number: account }],
  productCode: 'P',
  plannedShippingDateAndTime: plannedShippingDate + 'T12:00:00 GMT+00:00',
  unitOfMeasurement: 'metric',
  isCustomsDeclarable: true,
  monetaryAmount: [
    { typeCode: 'declaredValue', value: 100, currency: 'GHS' }
  ],
  packages: [
    { weight: req.weightKg || 1.0, dimensions: { length: 30, width: 20, height: 10 } }
  ]
};

fetch(DHL_API_BASE + '/rates', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: getAuthHeader(),
  },
  body: JSON.stringify(payload)
})
.then(res => res.text().then(text => ({ ok: res.ok, status: res.status, text })))
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(console.error);
