// Inscrição no Zoom a partir do card. O link longo fica no campo do Zoom.
// O link curto, o que vai no WhatsApp, aponta para /z/{id} no site.

export const ZOOM_MEETING_ID = "89725798988";
export const ZOOM_JOIN_FIELD = "cf_evento_link_individual_do_zoom";
export const ZOOM_SHORT_FIELD = "cf_evento_link_whatsapp";

export function splitZoomName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "Inscrito", last_name: "Live" };
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
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
