// Link curto /z/{id-do-card} → Zoom daquela pessoa.
// O WhatsApp leva só o curto. O endereço longo fica no campo do card.

const LEAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ZOOM_JOIN_FIELD = "cf_evento_link_individual_do_zoom";
export const ZOOM_REGISTER_FALLBACK = "https://us06web.zoom.us/webinar/register/WN_Z8uvnqr_Qyy58RRwtcngGQ";

const MQ_VISIT_TAGS = {
  "2026-11-03": "MQ26_D1_ENTROU",
  "2026-11-04": "MQ26_D2_ENTROU",
  "2026-11-05": "MQ26_D3_ENTROU",
};

export function mqAttendanceTag(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return MQ_VISIT_TAGS[day] || "";
}

export function zoomJoinTarget(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (host !== "zoom.us" && !host.endsWith(".zoom.us")) return null;
  return parsed.toString();
}

export async function resolveZoomShortLink({ code, getLead, fallback = ZOOM_REGISTER_FALLBACK }) {
  if (!LEAD_ID.test(String(code || ""))) return { status: 404 };
  const lead = await getLead(String(code));
  if (!lead) return { status: 404 };
  const fields = lead.custom_fields || {};
  const location = zoomJoinTarget(fields[ZOOM_JOIN_FIELD]);
  if (location) return { status: 302, location, lead };
  const fallbackLocation = zoomJoinTarget(fallback);
  if (fallbackLocation) return { status: 302, location: fallbackLocation, lead, fallback: true };
  return { status: 404, lead };
}
