// Runs as a Vercel serverless function at /api/config, and is also mounted by
// server/index.js for local development. Never add the secret key to this response.
export default function handler(req, res) {
  res.status(200).json({
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    name: process.env.CUSTOMER_NAME || 'Tungba',
    email: process.env.CUSTOMER_EMAIL || 'tungbafmradio@gmail.com',
    amount: Number(process.env.AMOUNT_NAIRA) || 157950,
  });
}
