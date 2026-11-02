// Inscrição no Zoom a partir do card. O link longo fica no campo do Zoom.
// O link curto, o que vai no WhatsApp, aponta para /z/{id} no site.

export const ZOOM_MEETING_ID = "89725798988";
export const ZOOM_WEBINAR_ID = "88194389798";
export const ZOOM_MQ_EVENT = "mes-da-qualidade-2026";
export const ZOOM_ERROR_TAG = "MQ26_ZOOM_ERRO";
export const ZOOM_JOIN_FIELD = "cf_evento_link_individual_do_zoom";
export const ZOOM_SHORT_FIELD = "cf_evento_link_whatsapp";

function clipZoomName(value) {
  const text = String(value || "").trim();
  return text.length > 64 ? text.slice(0, 64) : text;
}

export function splitZoomName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "Inscrito", last_name: "." };
  if (parts.length === 1) return { first_name: clipZoomName(parts[0]), last_name: "." };
  return {
    first_name: clipZoomName(parts[0]),
    last_name: clipZoomName(parts.slice(1).join(" ")),
  };
}

export function zoomLinkFields(leadId, joinUrl) {
  return {
    [ZOOM_JOIN_FIELD]: joinUrl,
    [ZOOM_SHORT_FIELD]: `https://templum.com.br/z/${leadId}`,
  };
}

export async function zoomAccessToken({ accountId, clientId, clientSecret, fetchImpl }) {
  const fetchFn = fetchImpl || fetch;
  const basic = btoa(`${clientId}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "account_credentials",
    account_id: accountId,
  });
  const res = await fetchFn("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const err = new Error("zoom_token");
    err.status = res.status;
    throw err;
  }
  return data.access_token;
}

export async function addMeetingRegistrant({ token, meetingId, email, firstName, lastName, fetchImpl }) {
  const fetchFn = fetchImpl || fetch;
  const res = await fetchFn(`https://api.zoom.us/v2/meetings/${meetingId}/registrants`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
      auto_approve: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.join_url) {
    const err = new Error("zoom_registrant");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data.join_url;
}

function zoomError(status, data) {
  const err = new Error("zoom_registrant");
  err.status = status;
  err.body = data || {};
  return err;
}

export async function findWebinarRegistrantJoinUrl({ token, webinarId, email, fetchImpl }) {
  const fetchFn = fetchImpl || fetch;
  const want = String(email || "").trim().toLowerCase();
  if (!want) return null;
  for (const status of ["approved", "pending"]) {
    let nextPageToken = "";
    for (let page = 0; page < 20; page++) {
      const url = new URL(`https://api.zoom.us/v2/webinars/${encodeURIComponent(webinarId)}/registrants`);
      url.searchParams.set("page_size", "300");
      url.searchParams.set("status", status);
      if (nextPageToken) url.searchParams.set("next_page_token", nextPageToken);
      const res = await fetchFn(url, { headers: { authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return null;
      const hit = (data.registrants || []).find((row) => {
        return String(row.email || "").trim().toLowerCase() === want && row.join_url;
      });
      if (hit) return hit.join_url;
      nextPageToken = data.next_page_token || "";
      if (!nextPageToken) break;
    }
  }
  return null;
}

export async function addWebinarRegistrant({ token, webinarId, email, firstName, lastName, fetchImpl }) {
  const fetchFn = fetchImpl || fetch;
  const res = await fetchFn(`https://api.zoom.us/v2/webinars/${encodeURIComponent(webinarId)}/registrants`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.join_url) return data.join_url;

  const message = String((data && data.message) || "");
  const already = res.ok || /already/i.test(message);
  if (already) {
    const existing = await findWebinarRegistrantJoinUrl({ token, webinarId, email, fetchImpl });
    if (existing) return existing;
  }
  throw zoomError(res.status, data);
}
