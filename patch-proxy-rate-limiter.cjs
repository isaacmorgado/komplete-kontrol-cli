#!/usr/bin/env node
/**
 * Patch Model Proxy Server with Rate Limiter
 *
 * This script adds rate limiting to the existing proxy server without
 * breaking existing functionality.
 *
 * Usage:
 *   node patch-proxy-rate-limiter.cjs
 *
 * What it does:
 * 1. Reads existing proxy server
 * 2. Injects rate limiter import and initialization
 * 3. Adds rate limiter calls before API requests
 * 4. Creates backup of original
 */

const fs = require('fs');
const path = require('path');

const PROXY_PATH = path.join(process.env.HOME, '.claude/model-proxy-server.js');
const BACKUP_PATH = PROXY_PATH + '.before-rate-limiter';
const RATE_LIMITER_PATH = path.join(process.env.HOME, '.claude/lib/rate-limiter.js');

console.log('🔧 Patching proxy server with rate limiter...\n');

// Check if files exist
if (!fs.existsSync(PROXY_PATH)) {
  console.error('❌ Proxy server not found at:', PROXY_PATH);
  process.exit(1);
}

if (!fs.existsSync(RATE_LIMITER_PATH)) {
  console.error('❌ Rate limiter not found at:', RATE_LIMITER_PATH);
  console.error('   Please ensure rate-limiter.js exists in ~/.claude/lib/');
  process.exit(1);
}

// Read proxy server
let proxyContent = fs.readFileSync(PROXY_PATH, 'utf8');

// Check if already patched
if (proxyContent.includes('rate-limiter.js')) {
  console.log('✓ Proxy server already patched with rate limiter');
  console.log('  No changes needed\n');
  process.exit(0);
}

// Create backup
fs.copyFileSync(PROXY_PATH, BACKUP_PATH);
console.log('✓ Created backup:', BACKUP_PATH);

// Patch 1: Add rate limiter import after other imports
const importPatch = `import { RateLimiter, retryWithBackoff, parseRetryAfter } from './lib/rate-limiter.js';
`;

// Find the line after the last import
const importIndex = proxyContent.lastIndexOf("import ");
const importEndIndex = proxyContent.indexOf('\n', importIndex);
proxyContent = proxyContent.slice(0, importEndIndex + 1) + importPatch + proxyContent.slice(importEndIndex + 1);

console.log('✓ Added rate limiter import');

// Patch 2: Initialize rate limiter after configuration
const rateLimiterInit = `
// Rate Limiter Configuration
const rateLimiter = new RateLimiter({
  glm: 60,           // Z.AI: 60 req/min
  featherless: 100,  // Featherless: 100 req/min (generous!)
  google: 60,        // Google: 60 req/min (free tier with OAuth)
  anthropic: 50      // Anthropic: 50 req/min (tier 1, adjust based on your tier)
});

// Log rate limit status every 30 seconds
setInterval(() => {
  const status = rateLimiter.getAllStatus();
  const statusLines = Object.values(status)
    .map(s => \`\${s.provider}: \${s.available}/\${s.limit} (\${s.percentage}%)\`)
    .join(', ');
  log(\`Rate limits: \${statusLines}\`, 'dim');
}, 30000);
`;

// Find where to insert (after log function definition)
const logFunctionIndex = proxyContent.indexOf('function log(message, color = \'reset\')');
const logFunctionEnd = proxyContent.indexOf('}', logFunctionIndex) + 1;
const nextLineIndex = proxyContent.indexOf('\n', logFunctionEnd) + 1;
proxyContent = proxyContent.slice(0, nextLineIndex) + rateLimiterInit + proxyContent.slice(nextLineIndex);

console.log('✓ Added rate limiter initialization');

// Patch 3: Add rate limiter wrapper for GLM requests
const glmRateLimitPatch = `
  // Rate limit check (GLM)
  try {
    await rateLimiter.waitForToken('glm', 10000); // 10s timeout
  } catch (error) {
    log('✗ GLM rate limit timeout', 'red');
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      type: 'error',
      error: {
        type: 'rate_limit_error',
        message: 'Rate limit: No available tokens for GLM provider. Please wait and try again.'
      }
    }));
    return;
  }
`;

// Find GLM request handler (after authentication check)
const glmHandlerIndex = proxyContent.indexOf('log(`→ GLM request:');
if (glmHandlerIndex > 0) {
  const insertIndex = proxyContent.lastIndexOf('\n', glmHandlerIndex);
  proxyContent = proxyContent.slice(0, insertIndex + 1) + glmRateLimitPatch + proxyContent.slice(insertIndex + 1);
  console.log('✓ Added rate limiter to GLM handler');
}

// Patch 4: Add rate limiter wrapper for Featherless requests
const featherlessRateLimitPatch = `
  // Rate limit check (Featherless)
  try {
    await rateLimiter.waitForToken('featherless', 10000); // 10s timeout
  } catch (error) {
    log('✗ Featherless rate limit timeout', 'red');
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      type: 'error',
      error: {
        type: 'rate_limit_error',
        message: 'Rate limit: No available tokens for Featherless provider. Please wait and try again.'
      }
    }));
    return;
  }
`;

const featherlessHandlerIndex = proxyContent.indexOf('log(`→ Featherless request:');
if (featherlessHandlerIndex > 0) {
  const insertIndex = proxyContent.lastIndexOf('\n', featherlessHandlerIndex);
  proxyContent = proxyContent.slice(0, insertIndex + 1) + featherlessRateLimitPatch + proxyContent.slice(insertIndex + 1);
  console.log('✓ Added rate limiter to Featherless handler');
}

// Patch 5: Add rate limiter wrapper for Google requests
const googleRateLimitPatch = `
  // Rate limit check (Google)
  try {
    await rateLimiter.waitForToken('google', 10000); // 10s timeout
  } catch (error) {
    log('✗ Google rate limit timeout', 'red');
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      type: 'error',
      error: {
        type: 'rate_limit_error',
        message: 'Rate limit: No available tokens for Google provider. Please wait and try again.'
      }
    }));
    return;
  }
`;

const googleHandlerIndex = proxyContent.indexOf('log(`→ Google request:');
if (googleHandlerIndex > 0) {
  const insertIndex = proxyContent.lastIndexOf('\n', googleHandlerIndex);
  proxyContent = proxyContent.slice(0, insertIndex + 1) + googleRateLimitPatch + proxyContent.slice(insertIndex + 1);
  console.log('✓ Added rate limiter to Google handler');
}

// Patch 6: Add rate limiter wrapper for Anthropic requests (passthrough)
const anthropicRateLimitPatch = `
  // Rate limit check (Anthropic)
  try {
    await rateLimiter.waitForToken('anthropic', 10000); // 10s timeout
  } catch (error) {
    log('✗ Anthropic rate limit timeout', 'red');
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      type: 'error',
      error: {
        type: 'rate_limit_error',
        message: 'Rate limit: No available tokens for Anthropic provider. Please wait and try again.'
      }
    }));
    return;
  }
`;

const anthropicHandlerIndex = proxyContent.indexOf('log(`→ Anthropic passthrough:');
if (anthropicHandlerIndex > 0) {
  const insertIndex = proxyContent.lastIndexOf('\n', anthropicHandlerIndex);
  proxyContent = proxyContent.slice(0, insertIndex + 1) + anthropicRateLimitPatch + proxyContent.slice(insertIndex + 1);
  console.log('✓ Added rate limiter to Anthropic handler');
}

// Write patched proxy
fs.writeFileSync(PROXY_PATH, proxyContent);
console.log('✓ Wrote patched proxy server\n');

console.log('✅ Proxy server successfully patched with rate limiter!');
console.log('');
console.log('Changes made:');
console.log('  - Added rate limiter import');
console.log('  - Initialized rate limiter with default limits');
console.log('  - Added rate limit checks before all API requests');
console.log('  - Added automatic status logging every 30 seconds');
console.log('');
console.log('Backup saved at:', BACKUP_PATH);
console.log('');
console.log('To apply changes, restart proxy:');
console.log('  pkill -f model-proxy-server');
console.log('  node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &');
console.log('');
console.log('To monitor rate limits:');
console.log('  tail -f /tmp/claude-proxy.log');
console.log('');
