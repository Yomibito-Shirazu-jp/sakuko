import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, phone, domain } = req.body;
  if (!email || !phone || !domain) {
    return res.status(400).json({ error: 'email, phone, domain required' });
  }

  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return res.status(400).json({ error: 'Invalid domain format' });
  }

  const phoneClean = phone.replace(/[\s\-().]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(phoneClean)) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      phone_number_collection: { enabled: true },
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: parseInt(process.env.TRIAL_DAYS || '3'),
        metadata: { email, phone: phoneClean, domain },
      },
      metadata: { email, phone: phoneClean, domain },
      success_url: `${process.env.BASE_URL}/success?domain=${encodeURIComponent(domain)}`,
      cancel_url: `${process.env.BASE_URL}/`,
      locale: 'ja',
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Checkout error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
