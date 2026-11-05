import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // /success?domain=xxx で来た場合
  const successDomain = router.query.domain;

  async function startCheckout(e) {
    e.preventDefault();
    setError('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('有効なメールアドレスを入力してください。'); return;
    }
    const phoneClean = phone.replace(/[\s\-().]/g, '');
    if (!phone || !/^\+?[0-9]{7,15}$/.test(phoneClean)) {
      setError('有効な電話番号を入力してください（例: 090-1234-5678）'); return;
    }
    if (!domain || !/^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?\.[a-z]{2,}$/.test(domain.toLowerCase())) {
      setError('有効なドメイン名を入力してください（例: example.com）'); return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phoneClean, domain: domain.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'エラーが発生しました');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>インターネット鎖国くん — 日本からのアクセスをブロック</title>
        <meta name="description" content="月¥1,000で日本国内IPとプロキシをCloudflare WAFで完全遮断。AI 6層防御 + 死活監視つき。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx global>{`
        :root {
          --bg: #0a0a0f; --surface: #111118; --surface2: #1a1a24;
          --border: #2a2a3a; --accent: #e63946; --accent2: #ff6b6b;
          --gold: #f4a261; --text: #e8e8f0; --text2: #9090a8;
          --success: #2ec4b6; --radius: 12px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: var(--bg); color: var(--text); font-family: 'Hiragino Kaku Gothic Pro','Noto Sans JP',system-ui,sans-serif; line-height: 1.6; }
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: rgba(10,10,15,0.85); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); }
        .logo { font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
        a.nav-cta { background: var(--accent); color: #fff; padding: 0.5rem 1.25rem; border-radius: 6px; font-size: 0.9rem; font-weight: 600; text-decoration: none; }
        .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 7rem 1.5rem 4rem; text-align: center; background: radial-gradient(ellipse at 50% 0%,rgba(230,57,70,.12) 0%,transparent 65%); }
        .badge { display: inline-block; background: rgba(230,57,70,.15); border: 1px solid rgba(230,57,70,.4); color: var(--accent2); padding: .3rem 1rem; border-radius: 999px; font-size: .8rem; font-weight: 600; letter-spacing: .05em; margin-bottom: 1.5rem; }
        h1 { font-size: clamp(2.2rem,7vw,4rem); font-weight: 900; letter-spacing: -.02em; line-height: 1.1; margin-bottom: 1.5rem; }
        h1 em { font-style: normal; color: var(--accent); }
        .subtitle { font-size: clamp(1rem,2.5vw,1.2rem); color: var(--text2); max-width: 560px; margin: 0 auto 2.5rem; }
        .price-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; justify-content: center; }
        .trial-badge { background: rgba(46,196,182,.1); border: 1px solid rgba(46,196,182,.35); color: var(--success); padding: .6rem 1.2rem; border-radius: var(--radius); font-weight: 800; font-size: 1.1rem; }
        .price-after { color: var(--text2); font-size: .9rem; }
        .price-after strong { color: var(--gold); }
        .chips { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-bottom: 1.5rem; font-size: .85rem; color: var(--text2); }
        .cta-btn { display: inline-block; background: linear-gradient(135deg,var(--accent) 0%,#c1121f 100%); color: #fff; text-decoration: none; padding: 1rem 2.5rem; border-radius: var(--radius); font-size: 1.1rem; font-weight: 700; box-shadow: 0 4px 24px rgba(230,57,70,.4); cursor: pointer; border: none; transition: transform .15s,box-shadow .15s; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(230,57,70,.5); }
        .cta-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
        section { padding: 5rem 1.5rem; }
        .section-label { text-align: center; font-size: .75rem; letter-spacing: .15em; color: var(--accent); font-weight: 700; text-transform: uppercase; margin-bottom: .75rem; }
        h2 { text-align: center; font-size: clamp(1.6rem,4vw,2.4rem); font-weight: 800; margin-bottom: 3rem; }
        .steps { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 1.5rem; max-width: 900px; margin: 0 auto; }
        .step { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem 1.5rem; position: relative; overflow: hidden; }
        .step::before { content: attr(data-n); position: absolute; top: -.5rem; right: 1rem; font-size: 5rem; font-weight: 900; color: rgba(255,255,255,.03); line-height: 1; }
        .step-icon { font-size: 2rem; margin-bottom: 1rem; }
        .step h3 { font-size: 1rem; font-weight: 700; margin-bottom: .5rem; }
        .step p { font-size: .9rem; color: var(--text2); }
        .features { background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 2rem; max-width: 1000px; margin: 0 auto; }
        .feature { display: flex; gap: 1rem; align-items: flex-start; }
        .feature-icon { width: 40px; height: 40px; flex-shrink: 0; background: rgba(230,57,70,.1); border: 1px solid rgba(230,57,70,.3); border-radius: 8px; display: grid; place-items: center; font-size: 1.1rem; }
        .feature h3 { font-size: .95rem; font-weight: 700; margin-bottom: .3rem; }
        .feature p { font-size: .85rem; color: var(--text2); }
        .layers { max-width: 700px; margin: 2rem auto 0; display: flex; flex-direction: column; gap: .5rem; }
        .layer { border-radius: 8px; padding: .75rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; }
        .layer.l1 { background: rgba(230,57,70,.12); border: 1.5px solid rgba(230,57,70,.5); }
        .layer.lm { background: var(--surface2); border: 1px solid var(--border); }
        .layer.l6 { background: rgba(46,196,182,.08); border: 1px solid rgba(46,196,182,.35); }
        .layer strong { font-weight: 700; }
        .layer span { font-size: .8rem; color: var(--text2); }
        .signup-section { background: radial-gradient(ellipse at 50% 100%,rgba(230,57,70,.08) 0%,transparent 60%); }
        .signup-card { max-width: 480px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 2.5rem; }
        .trial-banner { background: rgba(46,196,182,.08); border: 1px solid rgba(46,196,182,.3); border-radius: 8px; padding: .75rem 1rem; margin-bottom: 1.5rem; font-size: .85rem; color: var(--success); text-align: center; }
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; font-size: .85rem; font-weight: 600; margin-bottom: .4rem; color: var(--text2); }
        input { width: 100%; padding: .75rem 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: .95rem; outline: none; transition: border-color .15s; }
        input:focus { border-color: var(--accent); }
        .helper { font-size: .75rem; color: var(--text2); margin-top: .3rem; }
        .submit-btn { width: 100%; padding: .9rem; background: linear-gradient(135deg,var(--accent) 0%,#c1121f 100%); color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: opacity .15s,transform .15s; margin-top: .5rem; }
        .submit-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: .5; cursor: not-allowed; }
        .error-msg { margin-top: 1rem; padding: .75rem 1rem; border-radius: 8px; font-size: .85rem; background: rgba(230,57,70,.1); border: 1px solid rgba(230,57,70,.4); color: var(--accent2); }
        .fine-print { font-size: .75rem; color: var(--text2); text-align: center; margin-top: 1rem; }
        .success-card { max-width: 560px; margin: 0 auto; background: var(--surface); border: 1px solid rgba(46,196,182,.4); border-radius: var(--radius); padding: 2.5rem; text-align: center; }
        .faq-list { max-width: 700px; margin: 0 auto; }
        details { border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: .75rem; overflow: hidden; }
        summary { padding: 1rem 1.25rem; cursor: pointer; font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center; }
        summary::after { content: '+'; color: var(--accent); font-size: 1.3rem; }
        details[open] summary::after { content: '−'; }
        details p { padding: 0 1.25rem 1rem; color: var(--text2); font-size: .9rem; }
        footer { text-align: center; padding: 2rem 1rem; color: var(--text2); font-size: .8rem; border-top: 1px solid var(--border); }
      `}</style>

      <nav>
        <div className="logo"><span>🔒</span> インターネット鎖国くん</div>
        <a className="nav-cta" href="#signup">今すぐ始める</a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="badge">🇯🇵 Powered by Cloudflare WAF</div>
        <h1>日本国内メインの<br />サイトに<em>最適な盾</em></h1>
        <p className="subtitle">ドメインを追加するだけ。<br />鎖国 + AI が6層で自動防御。攻撃されても何もしなくていい。</p>
        <div className="price-row">
          <div className="trial-badge">🎉 3日間 無料</div>
          <div className="price-after">その後 <strong>¥1,000</strong> / 月（税込）</div>
        </div>
        <div className="chips">
          <span>🔒 日本IP遮断</span><span>🕵️ プロキシカット</span>
          <span>🤖 AI 6層防御</span><span>🟢 死活監視</span><span>📱 SMSアラート</span>
        </div>
        <a className="cta-btn" href="#signup">無料で3日間試す →</a>
      </section>

      {/* STEPS */}
      <section>
        <p className="section-label">How it works</p>
        <h2>3ステップで鎖国完了</h2>
        <div className="steps">
          <div className="step" data-n="1">
            <div className="step-icon">📱</div>
            <h3>メール＋携帯＋ドメイン入力</h3>
            <p>3つ入力するだけ。携帯はSMSアラートに使用。</p>
          </div>
          <div className="step" data-n="2">
            <div className="step-icon">💳</div>
            <h3>カード登録（3日無料）</h3>
            <p>トライアル終了後に ¥1,000/月。いつでも解約可。</p>
          </div>
          <div className="step" data-n="3">
            <div className="step-icon">🔗</div>
            <h3>NSを変更して完了</h3>
            <p>メールに届くネームサーバーに変更するだけ。あとは全自動。</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <p className="section-label">Features</p>
        <h2>AI 6層防御</h2>
        <div className="layers">
          <div className="layer l1"><strong style={{color:'var(--accent)'}}>Layer 1 — 鎖国ルール</strong><span>日本IP + プロキシ → 即時ブロック</span></div>
          <div className="layer lm"><strong>Layer 2 — Cloudflare Managed Rules</strong><span>MLで毎日自動更新 · SQLi · XSS · RCE</span></div>
          <div className="layer lm"><strong>Layer 3 — OWASP Core Ruleset</strong><span>OWASP Top 10 自動防御</span></div>
          <div className="layer lm"><strong>Layer 4 — Bot Fight Mode</strong><span>MLフィンガープリントでボット自動排除</span></div>
          <div className="layer lm"><strong>Layer 5 — Rate Limit</strong><span>100 req/min 超でIPブロック 10分間</span></div>
          <div className="layer l6"><strong style={{color:'var(--success)'}}>Layer 6 — DDoS Protection</strong><span>Cloudflare 常時稼働 · 自動吸収</span></div>
        </div>
        <div className="features-grid" style={{marginTop:'3rem'}}>
          {[
            ['🗾','日本IP完全ブロック','CloudflareのGeoIPで日本全IP帯を遮断。'],
            ['🕵️','プロキシ・VPN検知','IPレピュテーションで既知VPN/Proxyをカット。'],
            ['🟢','死活監視（1分間隔）','ダウンを即検知。メール＋SMSアラート。'],
            ['⏱️','レスポンスタイム計測','24h稼働率・平均応答速度を記録。'],
            ['🔄','即時ON/OFF','解約すれば即ルール無効化。ロックインなし。'],
            ['📊','Cloudflareダッシュボード','ブロック数・トラフィックをUIで確認可能。'],
          ].map(([icon, title, desc]) => (
            <div className="feature" key={title}>
              <div className="feature-icon">{icon}</div>
              <div><h3>{title}</h3><p>{desc}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* SIGNUP */}
      <section className="signup-section" id="signup">
        <p className="section-label">Get Started</p>
        <h2>今すぐ鎖国する</h2>

        {successDomain ? (
          <div className="success-card">
            <div style={{fontSize:'3rem',marginBottom:'1rem'}}>✅</div>
            <h3 style={{fontSize:'1.3rem',marginBottom:'.5rem'}}>お支払い完了！</h3>
            <p style={{color:'var(--text2)',marginBottom:'1.5rem'}}>
              メールに届くネームサーバーへ変更が確認され次第、鎖国が開始されます。
            </p>
            <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'8px',padding:'1rem',fontFamily:'monospace',color:'var(--success)'}}>
              保護ドメイン: {successDomain}
            </div>
          </div>
        ) : (
          <div className="signup-card">
            <div className="trial-banner">🎉 3日間無料トライアル — カード登録後に課金開始</div>
            <form onSubmit={startCheckout}>
              <div className="form-group">
                <label>メールアドレス</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div className="form-group">
                <label>携帯電話番号</label>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="090-1234-5678" />
                <div className="helper">ダウンアラートのSMS送信に使用します。</div>
              </div>
              <div className="form-group">
                <label>保護するドメイン</label>
                <input type="text" value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com" />
                <div className="helper">apexドメインのみ（example.com）。NS変更後に鎖国開始。</div>
              </div>
              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? '処理中…' : '無料で3日間試す →'}
              </button>
            </form>
            {error && <div className="error-msg">{error}</div>}
            <p className="fine-print">決済はStripeが処理。3日後に¥1,000/月の自動更新。いつでも解約可。</p>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section>
        <p className="section-label">FAQ</p>
        <h2>よくある質問</h2>
        <div className="faq-list">
          {[
            ['プロキシやVPNは本当に防げますか？','CloudflareのIPレピュテーションデータベースで既知VPN・プロキシプロバイダーの多くを遮断します。居住用IP（residential proxy）など未登録のIPは通過する場合があります。'],
            ['既存のサーバー設定は変わりますか？','ネームサーバーをCloudflareに向けるだけです。既存サーバー・ホスティング・SSL証明書はそのまま継続して使えます。'],
            ['海外からのアクセスには影響しますか？','日本（JP）および脅威スコアが高いIPのみブロックします。それ以外の国・クリーンなIPは通常通りアクセスできます。'],
            ['無料トライアル期間中に解約できますか？','はい。3日間のトライアル期間中に解約すれば一切課金されません。'],
            ['電話番号は何に使いますか？','サーバーダウン検知時のSMSアラート送信にのみ使用します。営業連絡・第三者提供は一切行いません。'],
            ['解約したらどうなりますか？','解約後、WAFルールは即時無効化されます。ゾーンは7日間保持後に削除されます。'],
          ].map(([q,a])=>(
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer>
        <p>© 2026 インターネット鎖国くん — Powered by Cloudflare WAF</p>
      </footer>
    </>
  );
}
