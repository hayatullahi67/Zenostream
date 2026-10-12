import { useEffect, useState } from 'react';
import PaystackPop from '@paystack/inline-js';

const nairaFormat = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

function WelcomeBanner({ name }) {
  return (
    <section className="banner">
      <div className="badge">
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="9" r="5" />
          <path d="M9 13.5 8 21l4-2.2L16 21l-1-7.5" />
        </svg>
      </div>
      <h1>
        Welcome back,
        <br />
        {name}
      </h1>
    </section>
  );
}

export default function App() {
  const [status, setStatus] = useState('idle'); // idle | paying | verifying | success
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [config, setConfig] = useState(null);

  // Settings come from the server's env vars (see /api/config in server/index.js).
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => setError('Could not load the page settings. Make sure the server is running.'));
  }, []);

  const busy = !config || status === 'paying' || status === 'verifying';

  async function verifyPayment(ref) {
    setStatus('verifying');
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(ref)}`);
      const data = await res.json();

      if (data.paid) {
        setReference(data.reference);
        setStatus('success');
      } else {
        setError(data.error || 'Payment could not be confirmed. Contact support with reference ' + ref);
        setStatus('idle');
      }
    } catch {
      setError('Could not confirm your payment. Contact support with reference ' + ref);
      setStatus('idle');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!config.publicKey) {
      setError('Paystack public key is missing. Add PAYSTACK_PUBLIC_KEY to the environment and restart.');
      return;
    }

    setStatus('paying');

    const popup = new PaystackPop();
    popup.newTransaction({
      key: config.publicKey,
      email: config.email,
      amount: Math.round(config.amount * 100),
      currency: 'NGN',
      metadata: {
        custom_fields: [
          { display_name: 'Product', variable_name: 'product', value: 'Zenostream stream key activation' },
          { display_name: 'Customer', variable_name: 'customer', value: config.name },
        ],
      },
      onSuccess: (transaction) => verifyPayment(transaction.reference),
      onCancel: () => {
        setError('Payment was cancelled.');
        setStatus('idle');
      },
      onError: (err) => {
        setError(err?.message || 'Something went wrong starting the payment.');
        setStatus('idle');
      },
    });
  }

  return (
    <>
      <header className="topbar">
        <span className="brand">Zenostream</span>
      </header>

      <main className="page">
        <WelcomeBanner name={config?.name || ''} />

        {status === 'success' ? (
          <section className="card success">
            <div className="tick">&#10003;</div>
            <h2>Stream key activated</h2>
            <p className="muted">Payment received. Thank you!</p>
            <p className="reference">Reference: {reference}</p>
          </section>
        ) : (
          <section className="card">
            <h2>Activate your stream key</h2>
            <p className="muted">Your stream URL goes live as soon as your payment is confirmed.</p>

            <div className="price">
              <span>Activation fee</span>
              <strong>{config ? nairaFormat.format(config.amount) : ''}</strong>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <button type="submit" disabled={busy}>
                {status === 'verifying'
                  ? 'Confirming payment...'
                  : status === 'paying'
                    ? 'Opening Paystack...'
                    : 'Activate your stream key'}
              </button>
            </form>

            <p className="message" role="alert">
              {error}
            </p>
            <p className="secure">Payments are secured by Paystack</p>
          </section>
        )}
      </main>
    </>
  );
}
