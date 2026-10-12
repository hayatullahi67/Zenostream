// Runs as a Vercel serverless function at /api/verify?reference=..., and is also
// mounted by server/index.js for local development.
export default async function handler(req, res) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
  // The expected price lives on the server so a payment of any other amount is rejected.
  const amountKobo = Math.round((Number(process.env.AMOUNT_NAIRA) || 157950) * 100);
  const reference = String(req.query.reference || '');

  if (!secretKey) {
    return res.status(500).json({ paid: false, error: 'Paystack secret key is not set in the environment.' });
  }
  if (!reference) {
    return res.status(400).json({ paid: false, error: 'Missing payment reference.' });
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body.status) {
      return res.status(502).json({ paid: false, error: body.message || 'Could not verify the payment.' });
    }

    const tx = body.data;
    const paid = tx.status === 'success' && tx.amount === amountKobo && tx.currency === 'NGN';

    res.status(200).json({ paid, status: tx.status, reference: tx.reference });
  } catch (err) {
    console.error('Paystack verify failed:', err);
    res.status(502).json({ paid: false, error: 'Could not reach Paystack to verify the payment.' });
  }
}
