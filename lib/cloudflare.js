

const CF_API = 'https://api.cloudflare.com/client/v4';

// 鎖国ルール: 日本IP + 脅威スコア14超（VPN/Proxy多数含む）
const SAKOKU_EXPRESSION = '(ip.geoip.country eq "JP") or (ip.threat_score gt 14)';

// Cloudflare 標準マネージドルールセット ID（全アカウント共通）
const CF_MANAGED_RULESET_ID  = 'efb7b8c949ac4650a09736fc376e9aee'; // Cloudflare Managed Rules（ML更新）
const CF_OWASP_RULESET_ID    = '4814384a9e5d4991b9815dcfc25d2f1f'; // OWASP Core Ruleset

class CloudflareClient {
  constructor(apiToken, accountId) {
    this.accountId = accountId;
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async _fetch(path, opts = {}) {
    const res = await fetch(`${CF_API}${path}`, {
      ...opts,
      headers: { ...this.headers, ...(opts.headers || {}) },
    });
    const json = await res.json();
    if (!json.success) {
      const msg = json.errors?.[0]?.message || JSON.stringify(json.errors);
      throw new Error(`CF API error: ${msg}`);
    }
    return json.result;
  }

  /** ゾーン作成。jump_start=true で既存DNSレコードを自動スキャン */
  async createZone(domain) {
    return this._fetch('/zones', {
      method: 'POST',
      body: JSON.stringify({
        name: domain,
        account: { id: this.accountId },
        jump_start: true,
        type: 'full',
      }),
    });
  }

  /** ゾーン取得 (status, nameservers) */
  async getZone(zoneId) {
    return this._fetch(`/zones/${zoneId}`);
  }

  /** 鎖国WAFカスタムルール（JP + Proxy遮断） */
  async applySakokuRule(zoneId) {
    return this._fetch(
      `/zones/${zoneId}/rulesets/phases/http_request_firewall_custom/entrypoint`,
      {
        method: 'PUT',
        body: JSON.stringify({
          rules: [{
            action: 'block',
            expression: SAKOKU_EXPRESSION,
            description: 'インターネット鎖国くん — JP + Proxy Block',
            enabled: true,
          }],
        }),
      }
    );
  }

  /**
   * AI防御一括有効化（ゾーン作成直後に呼ぶ）
   *
   *  Layer 1 — 鎖国カスタムルール（JP + Proxy）       ← applySakokuRule()
   *  Layer 2 — Cloudflare Managed Ruleset（ML自動更新） ← ここ
   *  Layer 3 — OWASP Core Ruleset                     ← ここ
   *  Layer 4 — Bot Fight Mode（MLボット検知）           ← ここ
   *  Layer 5 — レートリミット 100 req/60s              ← ここ
   *  Layer 6 — DDoS Protection（Cloudflare常時稼働）   ← 設定不要
   */
  async applyAiDefense(zoneId) {
    const errors = [];

    // Layer 2 & 3: Managed + OWASP Rulesets
    try {
      await this._fetch(
        `/zones/${zoneId}/rulesets/phases/http_request_firewall_managed/entrypoint`,
        {
          method: 'PUT',
          body: JSON.stringify({
            rules: [
              {
                action: 'execute',
                action_parameters: {
                  id: CF_MANAGED_RULESET_ID,
                  overrides: { action: 'block' },
                },
                expression: 'true',
                description: 'Cloudflare Managed Ruleset — AI auto-block',
                enabled: true,
              },
              {
                action: 'execute',
                action_parameters: {
                  id: CF_OWASP_RULESET_ID,
                  overrides: { action: 'block', sensitivity_level: 'medium' },
                },
                expression: 'true',
                description: 'OWASP Core Ruleset',
                enabled: true,
              },
            ],
          }),
        }
      );
    } catch (e) {
      errors.push(`ManagedRuleset: ${e.message}`);
    }

    // Layer 4: Bot Fight Mode
    try {
      await this._fetch(`/zones/${zoneId}/settings/bot_fight_mode`, {
        method: 'PATCH',
        body: JSON.stringify({ value: 'on' }),
      });
    } catch (e) {
      errors.push(`BotFightMode: ${e.message}`);
    }

    // Layer 5: Rate Limit — 100 req/60s → block 600s
    try {
      await this._fetch(
        `/zones/${zoneId}/rulesets/phases/http_ratelimit/entrypoint`,
        {
          method: 'PUT',
          body: JSON.stringify({
            rules: [{
              action: 'block',
              ratelimit: {
                characteristics: ['ip.src'],
                period: 60,
                requests_per_period: 100,
                mitigation_timeout: 600,
              },
              expression: 'true',
              description: '鎖国くん — Rate Limit 100req/min',
              enabled: true,
            }],
          }),
        }
      );
    } catch (e) {
      errors.push(`RateLimit: ${e.message}`);
    }

    if (errors.length) console.warn(`[AI Defense] partial errors: ${errors.join(' | ')}`);
    return { ok: errors.length === 0, errors };
  }

  /** サブスク停止時: 全ルール無効化 */
  async disableSakokuRule(zoneId) {
    const empty = { rules: [] };
    await this._fetch(
      `/zones/${zoneId}/rulesets/phases/http_request_firewall_custom/entrypoint`,
      { method: 'PUT', body: JSON.stringify(empty) }
    );
    await this._fetch(
      `/zones/${zoneId}/rulesets/phases/http_request_firewall_managed/entrypoint`,
      { method: 'PUT', body: JSON.stringify(empty) }
    ).catch(() => {});
    await this._fetch(
      `/zones/${zoneId}/rulesets/phases/http_ratelimit/entrypoint`,
      { method: 'PUT', body: JSON.stringify(empty) }
    ).catch(() => {});
    await this._fetch(`/zones/${zoneId}/settings/bot_fight_mode`, {
      method: 'PATCH',
      body: JSON.stringify({ value: 'off' }),
    }).catch(() => {});
  }

  /** ゾーン削除 */
  async deleteZone(zoneId) {
    return this._fetch(`/zones/${zoneId}`, { method: 'DELETE' });
  }

  /** ゾーン一覧 */
  async listZones(domain) {
    return this._fetch(`/zones?name=${encodeURIComponent(domain)}&status=active`);
  }
}

export { CloudflareClient, SAKOKU_EXPRESSION };
