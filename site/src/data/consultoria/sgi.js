import { baseConsultoria, setoresGerais } from "./_base.js";

export default {
  ...baseConsultoria,
  slug: "sgi",
  hero: {
    titulo: ["Implemente o ", "SGI", " e integre suas normas num só sistema"],
    sub: "Unifique ISO 9001, 14001, 45001 e outras num Sistema de Gestão Integrado, com método e garantia.",
    preco: "Investimento sob diagnóstico, com acompanhamento completo do início ao fim.",
  },
  paraQuem: setoresGerais,
  detalhes: {
    titulo: "O SGI em detalhes",
    sub: "Sistema de Gestão Integrado: várias normas operando como um único sistema, sem retrabalho.",
    faq: [
      { q: "O que é um SGI?", a: "É a integração de duas ou mais normas de gestão (ex.: ISO 9001 + 14001 + 45001) num único sistema, com processos e documentos compartilhados." },
      { q: "Qual é o objetivo principal do SGI?", a: "Eliminar duplicidade de esforços, reduzir custos e dar uma visão única da gestão, mantendo a conformidade com todas as normas." },
      { q: "Quais normas podem ser integradas?", a: "Normas com Estrutura de Alto Nível (HLS), como ISO 9001, ISO 14001 e ISO 45001, integram com facilidade." },
      { q: "Quais são os benefícios de um SGI?", a: "Menos retrabalho e documentos, auditorias combinadas, custos menores e decisões mais integradas." },
      { q: "Quem deve implementar um SGI?", a: "Empresas que já têm (ou querem) mais de uma certificação e buscam eficiência na gestão." },
      { q: "Já tenho uma ISO — vale integrar?", a: "Sim. Aproveitamos o que já existe e adicionamos as demais normas com o mínimo de retrabalho." },
      { q: "Como obter a certificação do SGI?", a: "As normas continuam sendo certificadas individualmente, mas com auditorias integradas. A Templum conduz todo o processo." },
    ],
  },
};
