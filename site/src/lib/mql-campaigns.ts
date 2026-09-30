/**
 * Campanhas de LP → funil MQL (fonte única: config/mql-campaigns.json).
 * Ao lançar campanha nova: edite só o JSON + LP + (se precisar) automação no Orbit.
 */
import config from "../../config/mql-campaigns.json";

export type MqlCampaign = (typeof config.campaigns)[number];
export type MqlCampaignKey = MqlCampaign["key"];

const bySlug = new Map(config.campaigns.map((c) => [c.slug, c]));
const byKey = new Map(config.campaigns.map((c) => [c.key, c]));

export const MQL_CAMPAIGN_SLUGS: readonly string[] = config.campaigns.map((c) => c.slug);

export function getMqlCampaignBySlug(slug: string): MqlCampaign | undefined {
  return bySlug.get(slug);
}

export function getMqlCampaignByKey(key: MqlCampaignKey): MqlCampaign {
  const c = byKey.get(key);
  if (!c) throw new Error(`Campanha MQL desconhecida: ${key}. Cadastre em config/mql-campaigns.json`);
  return c;
}

/** Slug enviado no POST /api/lead (`evento`). */
export function mqlCampaignSlug(key: MqlCampaignKey): string {
  return getMqlCampaignByKey(key).slug;
}

/** Props padrão da LP de campanha (evento + UTMs; ver docs/campanhas-mql.md). */
export function mqlCampaignLpProps(key: MqlCampaignKey) {
  const c = getMqlCampaignByKey(key);
  return {
    evento: c.slug,
    utmDefaults: c.utmDefaults ?? {},
    lpPath: c.lpPath,
  };
}
