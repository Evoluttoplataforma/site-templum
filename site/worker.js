// Worker da Templum: serve os arquivos estáticos (dist) e expõe POST /api/lead,
// que cadastra o lead no Mailchimp. Sem as secrets configuradas, responde ok
// sem cadastrar (a UX do formulário continua funcionando).
//
// Secrets necessárias (Settings → Variables/Secrets do Worker):
//   MAILCHIMP_API_KEY   ex.: abc123...-us21   (o datacenter vem após o "-")
//   MAILCHIMP_LIST_ID   ex.: 1a2b3c4d5e       (Audience ID)
//   MAILCHIMP_TAG       (opcional) ex.: site-templum

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead") {
      if (request.method !== "POST") {
        return json({ ok: false, error: "method_not_allowed" }, 405);
      }
      return handleLead(request, env);
    }

    // tudo o mais = arquivos estáticos (Astro build em ./dist)
    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function handleLead(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return json({ ok: false, error: "invalid_email" }, 422);
  }

  const apiKey = env.MAILCHIMP_API_KEY;
  const listId = env.MAILCHIMP_LIST_ID;

  // Sem credenciais → não quebra a experiência; apenas sinaliza não-configurado.
  if (!apiKey || !listId) {
    return json({ ok: true, configured: false });
  }

  const dc = apiKey.split("-")[1];
  if (!dc) return json({ ok: false, error: "bad_api_key" }, 500);

  const endpoint = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;
  const payload = {
    email_address: email,
    status: "subscribed",
    merge_fields: {
      FNAME: body.nome || "",
      PHONE: body.telefone || "",
      COMPANY: body.empresa || "",
      NORMA: body.norma || "",
      MENSAGEM: body.mensagem || "",
      ORIGEM: body.pagina || body.evento || "site",
    },
    tags: [env.MAILCHIMP_TAG || "site-templum"],
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Basic " + btoa("anystring:" + apiKey),
    },
    body: JSON.stringify(payload),
  });

  if (resp.ok) return json({ ok: true, configured: true });

  // "Member Exists" não é erro para nós — o lead já está na lista.
  const err = await resp.json().catch(() => ({}));
  if (err && err.title === "Member Exists") {
    return json({ ok: true, configured: true, existing: true });
  }
  return json({ ok: false, error: err.title || "mailchimp_error" }, 502);
}
