import Stripe from 'stripe';
import { buffer } from 'micro';
import { CloudflareClient } from '../../../lib/cloudflare';
import supabase from '../../../lib/db';

// Vercel: bodyParserを無効にしてrawBodyを取得
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const cf = new CloudflareClient(process.env.CF_API_TOKEN, process.env.CF_ACCOUNT_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await buffer(req);
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    console.error('Webhook signature error:', e.message);
    return res.status(400).send('Bad signature');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed':
        await handleSubscriptionLost(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
    }
  } catch (e) {
    console.error('Webhook handler error:', e.message);
    return res.status(500).send('Handler error');
  }

  res.json({ received: true });
}

async function handleCheckoutCompleted(session) {
  const { email, phone, domain } = session.metadata;
  const sub = await stripe.subscriptions.retrieve(session.subscription);

  const { data: customer } = await supabase
    .from('customers')
    .upsert(
      { email, phone, stripe_id: session.customer, sub_id: session.subscription, sub_status: sub.status },
      { onConflict: 'email' }
    )
    .select()
    .single();

  // Cloudflare zone作成
  let zone;
  try {
    zone = await cf.createZone(domain);
  } catch {
    const existing = await cf.listZones(domain);
    if (!existing?.length) throw new Error('Zone creation failed');
    zone = existing[0];
  }

  // 鎖国 + AI防御
  await cf.applySakokuRule(zone.id);
  await cf.applyAiDefense(zone.id);

  await supabase.from('domains').upsert({
    customer_id: customer.id,
    domain,
    cf_zone_id: zone.id,
    nameservers: zone.name_servers,
    status: zone.status === 'active' ? 'active' : 'pending',
  }, { onConflict: 'domain' });

  console.log(`✅ Protected: ${domain}`);
}

async function handleSubscriptionLost(obj) {
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('stripe_id', obj.customer)
    .single();
  if (!customer) return;

  await supabase.from('customers').update({ sub_status: 'canceled' }).eq('id', customer.id);

  const { data: domains } = await supabase
    .from('domains').select('cf_zone_id, domain').eq('customer_id', customer.id);

  for (const d of domains || []) {
    if (!d.cf_zone_id) continue;
    await cf.disableSakokuRule(d.cf_zone_id).catch(console.error);
    await supabase.from('domains').update({ status: 'paused' }).eq('cf_zone_id', d.cf_zone_id);
  }
}

async function handleSubscriptionUpdated(sub) {
  await supabase
    .from('customers')
    .update({ sub_status: sub.status })
    .eq('stripe_id', sub.customer);

  if (sub.status === 'active') {
    const { data: customer } = await supabase
      .from('customers').select('id').eq('stripe_id', sub.customer).single();
    const { data: domains } = await supabase
      .from('domains').select('*').eq('customer_id', customer.id).eq('status', 'paused');
    for (const d of domains || []) {
      await cf.applySakokuRule(d.cf_zone_id);
      await cf.applyAiDefense(d.cf_zone_id);
      await supabase.from('domains').update({ status: 'active' }).eq('id', d.id);
    }
  }
}
