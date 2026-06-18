/**
 * Positron Container Healthcheck Script
 * 
 * Called by Docker HEALTHCHECK or manual verification.
 * Verifies the server is alive and serving all required endpoints.
 * 
 * Usage:
 *   node scripts/healthcheck.js [--smoke] [--base-url=http://localhost:3000]
 * 
 * Exit codes:
 *   0 = healthy
 *   1 = unhealthy
 */

const BASE_URL = process.env.POSITRON_HEALTHCHECK_URL || 'http://localhost:3000';
const SMOKE_MODE = process.argv.includes('--smoke');
const VERBOSE = process.argv.includes('--verbose');

let failures = 0;

async function check(name, url, validator) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.status < 200 || res.status >= 500) {
      console.log(`[FAIL] ${name} — HTTP ${res.status}`);
      failures++;
      return;
    }
    if (validator) {
      const body = await res.json();
      if (!validator(body)) {
        console.log(`[FAIL] ${name} — validation failed`);
        failures++;
        return;
      }
    }
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.log(`[FAIL] ${name} — ${err.message}`);
    failures++;
  }
}

async function checkText(name, url, matcher) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.status < 200 || res.status >= 500) {
      console.log(`[FAIL] ${name} — HTTP ${res.status}`);
      failures++;
      return;
    }
    const text = await res.text();
    if (matcher && !matcher(text)) {
      console.log(`[FAIL] ${name} — content mismatch`);
      failures++;
      return;
    }
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.log(`[FAIL] ${name} — ${err.message}`);
    failures++;
  }
}

(async () => {
  console.log(`Positron Healthcheck — ${BASE_URL}`);
  console.log(`Mode: ${SMOKE_MODE ? 'SMOKE' : 'BASIC'}\n`);

  // ── Core Health ──
  await check(
    'API Health',
    `${BASE_URL}/api/health`,
    (body) => body.status === 'ok' || body.status === 'degraded'
  );

  if (!SMOKE_MODE) {
    if (failures > 0) process.exit(1);
    console.log('\nResult: PASS');
    process.exit(0);
  }

  // ── Smoke Test: All endpoints ──
  await check('Infrastructure Gates', `${BASE_URL}/api/infrastructure-gates/status`, (body) => {
    return (
      typeof body.status === 'string' &&
      body.runtimeStarted === false
    );
  });

  await check('Tool Gateway Status', `${BASE_URL}/api/tool-gateway/status`, (body) => {
    return (
      body.gatewayEnabled === false &&
      body.sealed === true &&
      body.runtimeActive === false
    );
  });

  // ── Web UI routes ──
  await checkText('Web Root', `${BASE_URL}/`, (text) => {
    return text.includes('Positron') || text.includes('root') || text.includes('html');
  });

  await checkText('Dashboard', `${BASE_URL}/dashboard`, (text) => {
    return text.includes('Positron') || text.includes('root') || text.includes('html');
  });

  await checkText('Providers', `${BASE_URL}/providers`, (text) => {
    return text.includes('Positron') || text.includes('root') || text.includes('html');
  });

  await checkText('Oversight', `${BASE_URL}/oversight`, (text) => {
    return text.includes('Positron') || text.includes('root') || text.includes('html');
  });

  await checkText('Blueprints', `${BASE_URL}/blueprints`, (text) => {
    return text.includes('Positron') || text.includes('root') || text.includes('html');
  });

  // ── Safety endpoint ──
  await check('Safety State', `${BASE_URL}/api/safety`, (body) => {
    return body.killSwitch === true;
  });

  console.log(`\n${failures === 0 ? 'Result: ALL PASS' : `Result: ${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
})();
