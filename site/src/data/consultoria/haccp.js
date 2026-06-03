import { baseConsultoria } from "./_base.js";

export default {
  ...baseConsultoria,
  slug: "haccp",
  hero: {
    titulo: ["Implemente o ", "HACCP", " com método e garantia em contrato"],
    sub: "Estruture o plano HACCP da sua empresa e garanta a segurança dos seus alimentos.",
    preco: "Investimento sob diagnóstico, com acompanhamento completo do início ao fim.",
  },
  paraQuem: [
    { icon: "solar:donut-bitten-bold", t: "Indústria de alimentos" },
    { icon: "solar:bottle-bold", t: "Bebidas" },
    { icon: "solar:chef-hat-bold", t: "Restaurantes e food service" },
    { icon: "solar:box-bold", t: "Embalagens" },
    { icon: "solar:leaf-bold", t: "Agroindústria" },
    { icon: "solar:delivery-bold", t: "Distribuição de alimentos" },
  ],
  motivos: [
    { t: "Acesso a grandes redes e exportação", d: "Sem um plano de segurança de alimentos estruturado, a empresa fica fora de muitas concorrências e cadeias de fornecimento. O HACCP comprova controle dos perigos e abre acesso a grandes redes, exportação e contratos mais exigentes." },
    { t: "Redução de riscos sanitários e recalls", d: "O HACCP previne contaminações, recalls e prejuízos operacionais, gerando menos perdas financeiras e muito mais previsibilidade na operação." },
    { t: "Padronização e maturidade da gestão", d: "A empresa sai do modo apagar incêndio e entra em gestão profissional, com processos padronizados, controle operacional e base para certificações como FSSC 22000 e ISO 22000." },
  ],
  beneficios: [
    "Acesso a grandes redes e exportação",
    "Homologação em grandes clientes",
    "Aumento de competitividade no mercado",
    "Abertura de novos canais de venda",
    "Fortalecimento da marca",
    "Segurança dos alimentos garantida",
    "Redução de riscos sanitários",
    "Prevenção de contaminações e recalls",
    "Melhoria da produtividade",
    "Controle operacional mais eficiente",
  ],
  detalhes: {
    titulo: "O HACCP em detalhes",
    sub: "Análise de Perigos e Pontos Críticos de Controle — a base da segurança de alimentos.",
    faq: [
      { q: "O que é o HACCP?", a: "É um sistema preventivo de segurança de alimentos baseado na Análise de Perigos e Pontos Críticos de Controle (APPCC)." },
      { q: "Qual é o objetivo principal do HACCP?", a: "Identificar, avaliar e controlar os perigos significativos para a segurança dos alimentos ao longo do processo." },
      { q: "Quais são os princípios do HACCP?", a: "São 7 princípios: análise de perigos, identificação dos PCCs, limites críticos, monitoramento, ações corretivas, verificação e registros." },
      { q: "O HACCP é uma certificação?", a: "O HACCP é uma metodologia/plano. Ele é a base de certificações como FSSC 22000 e ISO 22000, e atende exigências da Anvisa/MAPA." },
      { q: "O HACCP é obrigatório?", a: "Práticas de controle de segurança de alimentos são exigidas pela legislação sanitária para empresas do setor alimentício." },
      { q: "Quais são os benefícios da implementação?", a: "Menos riscos de contaminação, conformidade sanitária, acesso a clientes exigentes e base para certificações internacionais." },
      { q: "Como implementar o HACCP?", a: "Mapeando o processo, aplicando os 7 princípios e documentando o plano. A Templum elabora e implanta o plano com você." },
      { q: "Como o HACCP se relaciona com outras normas de segurança alimentar?", a: "O HACCP é a base de normas como FSSC 22000 e ISO 22000 — quem implanta o plano sai na frente para essas certificações." },
      { q: "Como o HACCP promove a melhoria contínua?", a: "Pelo monitoramento dos pontos críticos, ações corretivas, verificação e registros, mantendo o controle de segurança sempre atualizado." },
      { q: "O HACCP garante 100% de segurança alimentar?", a: "Nenhum sistema elimina 100% dos riscos, mas o HACCP controla os perigos significativos e reduz fortemente as chances de contaminação e recall." },
    ],
  },
};
