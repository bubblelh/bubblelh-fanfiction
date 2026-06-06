export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";
    const cors = corsHeaders(origin, allowedOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (!isAllowedOrigin(origin, allowedOrigin)) {
      return json({ error: "Origin not allowed" }, 403, cors);
    }

    if (env.ACCESS_TOKEN) {
      const token = request.headers.get("X-Bubble-Token") || "";
      if (token !== env.ACCESS_TOKEN) {
        return json({ error: "Unauthorized" }, 401, cors);
      }
    }

    if (url.pathname === "/sync") {
      return handleSync(request, env, cors);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    if (!env.DEEPSEEK_API_KEY) {
      return json({ error: "Missing DEEPSEEK_API_KEY secret" }, 500, cors);
    }

    const body = await request.text();
    const upstream = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`
      },
      body
    });

    const headers = new Headers(upstream.headers);
    for (const [key, value] of Object.entries(cors)) {
      headers.set(key, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers
    });
  }
};

async function handleSync(request, env, cors) {
  if (!env.DB) {
    return json({ error: "Missing D1 binding DB" }, 500, cors);
  }

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS app_state (
      user_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();

  const userId = env.SYNC_USER || "bubblelh";

  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT data, updated_at FROM app_state WHERE user_id = ?")
      .bind(userId)
      .first();
    return json(row ? { data: JSON.parse(row.data), updatedAt: row.updated_at } : { data: null, updatedAt: 0 }, 200, cors);
  }

  if (request.method === "POST") {
    const payload = await request.json();
    const updatedAt = Date.now();
    await env.DB.prepare(`
      INSERT INTO app_state (user_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `).bind(userId, JSON.stringify(payload.data || payload), updatedAt).run();
    return json({ ok: true, updatedAt }, 200, cors);
  }

  return json({ error: "Method not allowed" }, 405, cors);
}

function isAllowedOrigin(origin, allowedOrigin) {
  if (allowedOrigin === "*") return true;
  if (!origin) return false;
  return allowedOrigin.split(",").map(item => item.trim()).filter(Boolean).includes(origin);
}

function corsHeaders(origin, allowedOrigin) {
  const allowOrigin = isAllowedOrigin(origin, allowedOrigin) ? (allowedOrigin === "*" ? "*" : origin) : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Bubble-Token",
    "Vary": "Origin"
  };
}

function json(data, status = 200, headers = corsHeaders("", "*")) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}
