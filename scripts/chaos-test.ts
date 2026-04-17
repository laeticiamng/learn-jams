// ============================================================
// Chaos test — vérifie que rate-limit + circuit breaker tiennent
// sous charge. À lancer manuellement depuis un poste autorisé :
//   deno run --allow-net --allow-env scripts/chaos-test.ts
//
// Variables d'env requises :
//   SUPABASE_URL          — URL projet
//   SUPABASE_ANON_KEY     — clé anon
//   TEST_USER_JWT         — JWT d'un compte de test (pas un compte prod)
//
// Sortie : tableau récapitulatif (latence p50/p95, taux d'erreur,
// nombre de 429, état circuit breaker observé).
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const ANON = Deno.env.get("SUPABASE_ANON_KEY");
const JWT = Deno.env.get("TEST_USER_JWT");

if (!SUPABASE_URL || !ANON || !JWT) {
  console.error("Missing env: SUPABASE_URL / SUPABASE_ANON_KEY / TEST_USER_JWT");
  Deno.exit(1);
}

interface Result {
  status: number;
  ms: number;
  ok: boolean;
}

async function call(endpoint: string, body: Record<string, unknown>): Promise<Result> {
  const t0 = performance.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JWT}`,
        apikey: ANON!,
        "Idempotency-Key": crypto.randomUUID(), // anti-replay
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, ms: performance.now() - t0, ok: res.ok };
  } catch (e) {
    return { status: 0, ms: performance.now() - t0, ok: false };
  }
}

function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return Math.round(sorted[Math.floor((sorted.length - 1) * p)]);
}

async function burst(label: string, endpoint: string, body: Record<string, unknown>, count: number, parallel: number) {
  console.log(`\n=== ${label} : ${count} requêtes (concurrence ${parallel}) ===`);
  const results: Result[] = [];
  for (let i = 0; i < count; i += parallel) {
    const batch = Array.from({ length: Math.min(parallel, count - i) }, () => call(endpoint, body));
    results.push(...(await Promise.all(batch)));
  }
  const latencies = results.map((r) => r.ms);
  const success = results.filter((r) => r.ok).length;
  const rateLimited = results.filter((r) => r.status === 429).length;
  const breakerOpen = results.filter((r) => r.status === 503).length;
  const errors = results.filter((r) => !r.ok && r.status !== 429 && r.status !== 503).length;
  console.table({
    total: results.length,
    success,
    "429_rate_limited": rateLimited,
    "503_circuit_open": breakerOpen,
    "5xx_errors": errors,
    p50_ms: pct(latencies, 0.5),
    p95_ms: pct(latencies, 0.95),
    p99_ms: pct(latencies, 0.99),
  });
  return { results, success, rateLimited, breakerOpen, errors };
}

console.log("🧪 Chaos test démarré sur", SUPABASE_URL);

// 1. Burst rate-limit : 50 req/s sur extract-document, devrait déclencher 429
await burst("Rate-limit extract-document", "extract-document", { text: "Lorem ipsum chaos test" }, 50, 10);

// 2. Stress quotidien : 20 req génération (limite Pro = ~30/mois), devrait passer
await burst("Quota generate-quiz", "generate-quiz", { topic: "chaos test", count: 3 }, 20, 5);

// 3. Idempotency check : même clé répétée 5×, devrait retourner replay
console.log("\n=== Idempotency replay ===");
const fixedKey = crypto.randomUUID();
const replayResults: Result[] = [];
for (let i = 0; i < 5; i++) {
  const t0 = performance.now();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${JWT}`,
      apikey: ANON!,
      "Idempotency-Key": fixedKey,
    },
    body: JSON.stringify({ topic: "replay", count: 1 }),
  });
  const replayHeader = res.headers.get("X-Idempotent-Replay");
  console.log(`  attempt ${i + 1}: status=${res.status} replay=${replayHeader} ${Math.round(performance.now() - t0)}ms`);
  replayResults.push({ status: res.status, ms: performance.now() - t0, ok: res.ok });
}

console.log("\n✅ Chaos test terminé. Vérifier /admin/observability pour confirmer alertes/circuits.");
