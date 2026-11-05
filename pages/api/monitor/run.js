import supabase from '../../../lib/db';

// Vercel Cron Job がこのエンドポイントを1分ごとに呼ぶ
// vercel.json の crons 設定で定義

const TIMEOUT_MS = 10_000;

async function checkDomain(url) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'SakokuMonitor/1.0' },
    });
    return {
      status: res.ok || res.status < 500 ? 'up' : 'down',
      status_code: res.status,
      response_time_ms: Date.now() - start,
    };
  } catch (e) {
    return { status: 'down', status_code: null, response_time_ms: Date.now() - start };
  }
}

async function sendAlert(email, phone, domain, type) {
  const isDown = type === 'down';
  const subject = isDown
    ? `🔴 [鎖国くん] ${domain} がダウンしました`
    : `✅ [鎖国くん] ${domain} が復旧しました`;

  // メールアラート (Resend)
  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'monitor@sakoku.example.com',
        to: email,
        subject,
        html: `<p><strong>${domain}</strong> が${isDown ? 'ダウン' : '復旧'}しました。</p>
               <p>時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>`,
      }),
    }).catch(console.error);
  }

  // SMSアラート (Twilio)
  if (process.env.TWILIO_SID && phone) {
    const auth = Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_TOKEN}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: process.env.TWILIO_FROM,
        To: phone,
        Body: `[鎖国くん] ${domain} ${isDown ? 'がダウンしました' : 'が復旧しました'}`,
      }),
    }).catch(console.error);
  }
}

export default async function handler(req, res) {
  // Vercel Cron からのリクエストのみ許可
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const { data: domains } = await supabase
    .from('domains')
    .select('id, domain, status, customers(email, phone)')
    .in('status', ['active', 'pending']);

  if (!domains?.length) return res.json({ checked: 0 });

  const results = await Promise.allSettled(
    domains.map(async (d) => {
      const result = await checkDomain(`https://${d.domain}`);

      const { data: last } = await supabase
        .from('monitor_checks')
        .select('status')
        .eq('domain_id', d.id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      await supabase.from('monitor_checks').insert({
        domain_id: d.id,
        status: result.status,
        status_code: result.status_code,
        response_time_ms: result.response_time_ms,
      });

      if (last && last.status !== result.status) {
        const { email, phone } = d.customers || {};
        if (email) {
          await sendAlert(email, phone, d.domain, result.status);
          await supabase.from('monitor_alerts').insert({
            domain_id: d.id,
            alert_type: result.status,
          });
        }
      }

      return { domain: d.domain, status: result.status };
    })
  );

  res.json({ checked: domains.length, results: results.map(r => r.value || r.reason) });
}
