/*
 * Configuração de conteúdo da LP ISO 9001 — Templum.
 * Edite este arquivo para trocar textos, variantes, cases e integrações
 * sem mexer no HTML. Itens marcados com "PENDENTE" dependem de aprovação.
 */
window.LP_CONFIG = {
  // "homologacao" mostra o painel de variantes. "producao" esconde o painel.
  // ?v=a ... ?v=f continua forçando a headline. ?preview=1 reabre o painel.
  mode: "producao",

  // ---------- Variantes de headline (teste A/B) ----------
  // A atribuição é persistente por visitante (localStorage).
  // Para forçar uma variante por grupo de anúncios, use ?v=a ... ?v=f na URL final.
  experiment: {
    id: "lp_iso9001_headline_v1",
    // Variantes que entram no sorteio. Comece com poucas (ex.: ["a","b","f"])
    // para não dividir tráfego baixo em seis grupos.
    // As 6 headlines do documento de copy, sorteadas por visitante.
    activeVariants: ["a", "b", "c", "d", "e", "f"],
    storageKey: "tpl_lp9001_variant"
  },

  variants: {
    control: {
      label: "Controle",
      premise: "O próximo grande contrato pode exigir ISO 9001.",
      headline: "Prepare sua empresa para a certificação ISO 9001 e novas oportunidades de negócio.",
      subheadline: "A Templum ajuda sua empresa a implementar os requisitos da ISO 9001 para atender às exigências de clientes, preparar-se para homologações e disputar novas oportunidades comerciais.",
      cta: "Solicitar proposta ISO 9001"
    },
    a: {
      label: "A · Exigência de clientes",
      premise: "Grandes clientes podem exigir mais do que bons produtos.",
      headline: "Seu cliente exige ISO 9001? Prepare sua empresa para atender a esse requisito.",
      subheadline: "Conte com a Templum para implementar os requisitos da ISO 9001, organizar sua empresa e se preparar para a auditoria de certificação.",
      cta: "Solicitar proposta ISO 9001"
    },
    b: {
      label: "B · Novas oportunidades",
      premise: "O próximo contrato pode exigir ISO 9001.",
      headline: "Prepare sua empresa para conquistar novas oportunidades com a certificação ISO 9001.",
      subheadline: "A Templum orienta a implementação da ISO 9001 para que sua empresa esteja preparada para atender às exigências de certificação de novos clientes.",
      cta: "Solicitar proposta ISO 9001"
    },
    c: {
      label: "C · Licitações",
      premise: "Algumas oportunidades exigem comprovação de qualidade certificada.",
      headline: "Sua empresa precisa da ISO 9001 para participar de licitações?",
      subheadline: "Estruture sua implementação com especialistas e prepare-se para atender aos requisitos de certificação previstos nos processos aplicáveis.",
      cta: "Solicitar proposta ISO 9001"
    },
    d: {
      label: "D · Risco comercial",
      premise: "Uma exigência documental pode limitar grandes oportunidades.",
      headline: "Não deixe a falta da ISO 9001 limitar suas oportunidades comerciais.",
      subheadline: "Conheça a consultoria Templum e prepare sua empresa para a certificação com um plano de implementação adequado à sua realidade.",
      cta: "Solicitar proposta ISO 9001"
    },
    e: {
      label: "E · Clareza contratual",
      premise: "A certificação exige método, não improviso.",
      headline: "Consultoria ISO 9001 com especialistas, método e condições claras em contrato.",
      subheadline: "Entenda o escopo da consultoria, as responsabilidades da sua equipe e as condições da contratação para avaliar o projeto com quem aprova o investimento.",
      cta: "Solicitar proposta ISO 9001"
    },
    f: {
      label: "F · Plano de implementação",
      premise: "Um plano claro evita atrasos desnecessários.",
      headline: "Precisa certificar sua empresa na ISO 9001? Comece com um plano claro.",
      subheadline: "Entenda as etapas, responsabilidades e o cronograma adequado à sua empresa com a orientação dos especialistas da Templum.",
      cta: "Solicitar proposta ISO 9001"
    }
  },

  // ---------- Dados de mercado ----------
  // PENDENTE: conferir os números na base oficial do ISO Survey 2025 antes de publicar.
  // Bloco opcional, depois do apoio à decisão. false oculta a seção inteira.
  market: {
    show: true,
    series: [
      { year: "2024", value: 1474118 },
      { year: "2025", value: 1611729 }
    ],
    change: "+9,34%",
    source: "ISO Survey 2025, dados divulgados pela DQS",
    sourceUrl: "https://www.dqsglobal.com/es/acerca-de/sala-de-prensa/iso-survey-2025-las-certificaciones-iso-crecen-un-11-en-el-mundo-y-un-28-en-espana"
  },

  // ---------- Cases ----------
  // PENDENTE: só preencher com cases autorizados por escrito pelo cliente.
  // Formato: { company, sector, challenge, solution, result, logo, photo }
  // Com a lista vazia, a seção não aparece.
  cases: [],

  // ---------- Formulário ----------
  form: {
    // POST /api/lead no mesmo domínio. O Worker grava o lead e cria o card no funil INBOUND.
    endpoint: "/api/lead",
    privacyUrl: "https://templum.com.br/politica-de-privacidade",
    // Domínios a recusar no campo de e-mail (ex.: "gmail.com"). Vazio = aceita qualquer e-mail válido.
    blockedEmailDomains: []
  },

  // WhatsApp (saída secundária do formulário). Número do rodapé de templum.com.br.
  whatsapp: {
    number: "5519993521270",
    message: "Olá! Vim pelo site da Templum e quero saber sobre a ISO 9001."
  },

  // ISO 9001:2026
  iso2026: {
    showTransitionDates: true,  // PENDENTE: confirmar 31/03/2028 e 30/09/2029 com a certificadora
    showTransitionOffer: false  // PENDENTE: confirmar se a oferta de transição entra nesta LP
  },

  // Logos de clientes na faixa final. PENDENTE: autorização de uso em anúncio.
  clientLogos: { show: false },

  // Parâmetros de campanha preservados e enviados como campos ocultos.
  trackingParams: ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "gad_source", "gad_campaignid", "fbclid"]
};
