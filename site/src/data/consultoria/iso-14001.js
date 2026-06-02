import { baseConsultoria } from "./_base.js";

export default {
  ...baseConsultoria,
  slug: "iso-14001",
  hero: {
    titulo: ["Certificado na ", "ISO 14001", " ou receba 2x o investimento de volta"],
    sub: "Implemente a gestão ambiental da sua empresa com método próprio e garantia em contrato.",
    preco: "Investimento sob diagnóstico, com acompanhamento completo do início ao fim.",
  },
  paraQuem: [
    { icon: "solar:factory-bold", t: "Indústria e manufatura" },
    { icon: "solar:buildings-2-bold", t: "Construção civil" },
    { icon: "solar:leaf-bold", t: "Agronegócio" },
    { icon: "solar:bolt-bold", t: "Energia e utilities" },
    { icon: "solar:delivery-bold", t: "Logística e transporte" },
    { icon: "solar:case-round-bold", t: "Serviços" },
  ],
  detalhes: {
    titulo: "A ISO 14001 em detalhes",
    sub: "Sistemas de gestão ambiental para empresas que querem reduzir impactos e gerar valor.",
    faq: [
      { q: "O que é a ISO 14001?", a: "É a norma internacional de Sistemas de Gestão Ambiental. Ajuda a empresa a identificar, controlar e reduzir seus impactos ambientais de forma sistemática." },
      { q: "Qual é o objetivo principal da ISO 14001?", a: "Melhorar o desempenho ambiental, garantir conformidade legal e demonstrar responsabilidade ambiental ao mercado." },
      { q: "Quais são os benefícios da implementação da ISO 14001?", a: "Redução de custos com recursos e resíduos, conformidade legal, acesso a novos mercados e fortalecimento da imagem da marca." },
      { q: "Quais são os principais elementos da ISO 14001?", a: "Política ambiental, aspectos e impactos, requisitos legais, objetivos, controle operacional e melhoria contínua, no ciclo PDCA." },
      { q: "Como obter a certificação ISO 14001?", a: "Implantando o sistema de gestão ambiental conforme a norma e passando por auditoria de um organismo certificador. A Templum conduz todo o processo." },
      { q: "A certificação ISO 14001 é obrigatória?", a: "Não por lei, mas é cada vez mais exigida em licitações, cadeias de fornecimento e por clientes que valorizam sustentabilidade." },
      { q: "Qual é a validade da certificação?", a: "3 anos, com auditorias de manutenção anuais." },
      { q: "Quem pode implementar a ISO 14001?", a: "Qualquer organização, de qualquer setor ou porte, que queira gerenciar melhor seus impactos ambientais." },
    ],
  },
};
