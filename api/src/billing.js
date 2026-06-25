// billing.js — minimal API-key auth + per-call metering (MVP stub).
//
// PRODUCTION: replace the in-memory store with a real DB/KV, and/or front the
// whole API with a no-code metered proxy:
//   - xpay.sh  : paste API URL, set per-call price, agents pay automatically
//   - x402     : HTTP 402 + USDC micropayment per request (Coinbase/Cloudflare)
//   - Stripe MPP / usage-based billing
// This stub exists so the API is usable and metered today; it is NOT the moat.

const usage = new Map(); // apiKey -> { calls, units }

// Comma-separated keys in API_KEYS env. Empty = open (dev only).
function validKeys() {
  return (process.env.API_KEYS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function authMiddleware() {
  const keys = validKeys();
  return async (c, next) => {
    if (keys.length === 0) return next(); // dev: no auth configured
    const key = c.req.header("x-api-key") || "";
    if (!keys.includes(key)) {
      return c.json({ error: "Invalid or missing x-api-key" }, 401);
    }
    c.set("apiKey", key);
    await next();
  };
}

export function meter(apiKey, units = 1) {
  const k = apiKey || "anonymous";
  const cur = usage.get(k) || { calls: 0, units: 0 };
  cur.calls += 1;
  cur.units += units;
  usage.set(k, cur);
  return cur;
}

export function getUsage(apiKey) {
  return usage.get(apiKey || "anonymous") || { calls: 0, units: 0 };
}
