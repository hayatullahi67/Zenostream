import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || '';
const CUSTOMER_NAME = process.env.CUSTOMER_NAME || 'Tungba';
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL || 'tungbafmradio@gmail.com';

// The expected price lives on the server so a payment of any other amount is rejected.
const AMOUNT_NAIRA = Number(process.env.AMOUNT_NAIRA) || 157950;
const AMOUNT_KOBO = Math.round(AMOUNT_NAIRA * 100);

// The React page reads its settings from here at runtime, so plain env vars work
// on any host without the VITE_ prefix. Never add the secret key to this response.
app.get('/api/config', (req, res) => {
  res.json({
    publicKey: PAYSTACK_PUBLIC_KEY,
    name: CUSTOMER_NAME,
    email: CUSTOMER_EMAIL,
    amount: AMOUNT_NAIRA,
  });
});

app.get('/api/verify/:reference', async (req, res) => {
  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ paid: false, error: 'Paystack secret key is not set in the .env file.' });
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(req.params.reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body.status) {
      return res.status(502).json({ paid: false, error: body.message || 'Could not verify the payment.' });
    }

    const tx = body.data;
    const paid = tx.status === 'success' && tx.amount === AMOUNT_KOBO && tx.currency === 'NGN';

    res.json({ paid, status: tx.status, reference: tx.reference });
  } catch (err) {
    console.error('Paystack verify failed:', err);
    res.status(502).json({ paid: false, error: 'Could not reach Paystack to verify the payment.' });
  }
});

// After "npm run build", this server also serves the React app.
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Zenostream API running at http://localhost:${PORT}`);
  if (!PAYSTACK_SECRET_KEY) {
    console.log('PAYSTACK_SECRET_KEY is missing. Add it to the .env file, then restart.');
  }
});
