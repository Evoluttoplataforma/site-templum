import { baseConsultoria } from "./_base.js";

export default {
  ...baseConsultoria,
  slug: "iso-27001",
  hero: {
    titulo: ["Certificado na ", "ISO 27001", " ou receba 2x o investimento de volta"],
    sub: "Proteja os dados da sua empresa com um sistema de gestão de segurança da informação certificado.",
    preco: "Investimento sob diagnóstico, com acompanhamento completo do início ao fim.",
  },
  paraQuem: [
    { icon: "solar:code-square-bold", t: "Tecnologia e software" },
    { icon: "solar:card-bold", t: "Serviços financeiros" },
    { icon: "solar:health-bold", t: "Saúde e dados sensíveis" },
    { icon: "solar:cart-large-2-bold", t: "E-commerce" },
    { icon: "solar:phone-bold", t: "Telecom" },
    { icon: "solar:buildings-3-bold", t: "Órgãos e cartórios" },
  ],
  detalhes: {
    titulo: "A ISO 27001 em detalhes",
    sub: "Segurança da informação para empresas que tratam dados críticos e querem confiança do mercado.",
    faq: [
      { q: "Quanto tempo leva para conseguir a certificação?", a: "Depende do tamanho e da maturidade da empresa. No diagnóstico inicial apresentamos um cronograma realista — o método e a plataforma Orbit encurtam o caminho." },
      { q: "Preciso ter equipe de TI interna?", a: "Não necessariamente. Conduzimos a implementação e elaboramos os documentos; o envolvimento da TI ajuda, mas não é pré-requisito." },
      { q: "A certificação é mesmo garantida por contrato?", a: "Sim. Se você concluir todas as etapas do método e ainda assim não certificar, devolvemos 200% do investimento." },
      { q: "E se eu não passar na auditoria?", a: "Acompanhamos a auditoria do início ao fim e tratamos eventuais não-conformidades até a certificação — coberto pela garantia." },
      { q: "É possível adaptar o projeto à minha realidade?", a: "Sim, o cronograma e o escopo são definidos a partir do diagnóstico da sua empresa." },
      { q: "Como funciona o suporte?", a: "Você tem um consultor dedicado e suporte diário em horário comercial, em tempo real." },
      { q: "O que é a ISO 27001?", a: "É a norma internacional de Sistemas de Gestão de Segurança da Informação (SGSI), que protege a confidencialidade, integridade e disponibilidade dos dados." },
      { q: "Qual é a validade da certificação?", a: "3 anos, com auditorias de manutenção anuais." },
    ],
  },
};
