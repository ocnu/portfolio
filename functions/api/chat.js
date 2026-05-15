/**
 * Cloudflare Pages Function — /api/chat
 * Proxies requests to the Anthropic API server-side
 * so the API key is never exposed to the browser.
 *
 * SETUP:
 * 1. Go to your Cloudflare Pages project
 * 2. Settings → Environment Variables
 * 3. Add: ANTHROPIC_API_KEY = sk-ant-...your key...
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS — allow your own domain only in production
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Check API key is configured
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Cloudflare Pages environment variables.' }),
      { status: 500, headers }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { messages, system } = body;

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400, headers });
  }

  // Call Anthropic API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: system || '',
      messages: messages.slice(-10), // last 10 messages to stay within limits
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(
      JSON.stringify({ error: 'Anthropic API error', detail: err }),
      { status: response.status, headers }
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), { status: 200, headers });
}

// Handle preflight CORS requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
