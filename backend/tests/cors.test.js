import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import { createCorsOptions } from '../config/cors.js';

const originAllowed = (options, origin) => new Promise(resolve => {
  options.origin(origin, (error, allowed) => resolve({ error, allowed }));
});

const env = {
  FRONTEND_ORIGIN: 'https://projectabc-frontend.vercel.app',
  EXTRA_ORIGINS: 'https://staging.example.com',
  VERCEL_PREVIEW_FRONTEND_HOST_PATTERN:
    'projectabc-frontend-*-muah327-1349s-projects.vercel.app'
};

test('allows production, configured feature previews, and localhost', async () => {
  const options = createCorsOptions(env);

  for (const origin of [
    'https://projectabc-frontend.vercel.app',
    'https://projectabc-frontend-bag3xkp1z-muah327-1349s-projects.vercel.app',
    'https://projectabc-frontend-git-feature-rapidocr-integration-muah327-1349s-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ]) {
    const result = await originAllowed(options, origin);
    assert.equal(result.error, null, origin);
    assert.equal(result.allowed, true, origin);
  }
});

test('rejects unrelated and lookalike origins', async () => {
  const options = createCorsOptions(env);

  for (const origin of [
    'https://unrelated-project.vercel.app',
    'https://projectabc-frontend-attacker-team.vercel.app',
    'https://projectabc-frontend-bad-muah327-1349s-projects.vercel.app.evil.example',
    'http://projectabc-frontend-bad-muah327-1349s-projects.vercel.app'
  ]) {
    const result = await originAllowed(options, origin);
    assert.match(result.error?.message || '', /not allowed/i, origin);
    assert.equal(result.allowed, undefined, origin);
  }
});

test('keeps credentials and authorization-header preflight support enabled', () => {
  const options = createCorsOptions(env);
  assert.equal(options.credentials, true);
  assert.ok(options.methods.includes('OPTIONS'));
  assert.ok(options.allowedHeaders.includes('Authorization'));
  assert.ok(options.allowedHeaders.includes('Content-Type'));
});

test('OPTIONS returns a credentialed preflight response before protected routes', async t => {
  const options = createCorsOptions(env);
  const app = express();
  app.use(cors(options));
  app.options('*', cors(options));
  app.post('/api/auth/login', (_req, res) => res.sendStatus(401));

  const server = app.listen(0);
  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise(resolve => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://projectabc-frontend-bag3xkp1z-muah327-1349s-projects.vercel.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type'
    },
    redirect: 'manual'
  });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'https://projectabc-frontend-bag3xkp1z-muah327-1349s-projects.vercel.app'
  );
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  assert.match(response.headers.get('access-control-allow-headers') || '', /Authorization/i);
});

test('requires a narrowly formed Vercel preview hostname pattern', () => {
  assert.throws(
    () => createCorsOptions({ VERCEL_PREVIEW_FRONTEND_HOST_PATTERN: '*.example.com' }),
    /scoped \.vercel\.app hostname/
  );
  assert.throws(
    () => createCorsOptions({ VERCEL_PREVIEW_FRONTEND_HOST_PATTERN: '*.vercel.app' }),
    /scoped \.vercel\.app hostname/
  );
});
