import { baseConsultoria, setoresGerais } from "./_base.js";

export default {
  ...baseConsultoria,
  slug: "sgi",
  hero: {
    titulo: ["Do diagnóstico à certificação — com consultores experientes e ", "tecnologia", " que acelera cada etapa."],
    sub: "Certificamos sua empresa com garantia em contrato.",
    preco: "",
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
  motivos: [
    { t: "Múltiplas certificações com metade do esforço", d: "Com o SGI, ISO 9001, 14001 e 45001 compartilham documentos, processos e auditorias. Você conquista três certificados sem triplicar o trabalho — e sem triplicar o custo." },
    { t: "Redução de custos com auditorias", d: "Auditorias integradas custam menos do que três auditorias separadas. Empresas com SGI economizam significativamente nas manutenções anuais e nas renovações trienais." },
    { t: "Visão única da gestão da empresa", d: "Em vez de três sistemas paralelos que ninguém integra, o SGI cria um único painel de controle — onde qualidade, meio ambiente e segurança se comunicam e se reforçam." },
    { t: "Menos burocracia, mais eficiência", d: "Procedimentos, registros e treinamentos que antes eram triplicados passam a ser unificados. A equipe tem menos documentos para manter e mais tempo para o que gera resultado." },
    { t: "Acesso simultâneo a contratos que exigem múltiplas normas", d: "Muitos contratos industriais, de construção e de fornecimento exigem ISO 9001 + 14001 + 45001 juntas. O SGI entrega as três de forma integrada e eficiente." },
    { t: "Facilidade para adicionar novas normas", d: "Com a Estrutura de Alto Nível (HLS) que todas as ISOs compartilham, adicionar ISO 37001 ou ISO 27001 ao sistema existente é muito mais simples do que começar do zero." },
    { t: "Menor resistência interna à implementação", d: "Um único projeto integrado gera menos mudança de rotina do que três projetos separados. A equipe absorve melhor e o engajamento é maior quando tudo faz sentido junto." },
    { t: "Demonstração de maturidade de gestão", d: "Empresas com SGI certificado sinalizam ao mercado que a gestão é robusta, integrada e auditada em múltiplas dimensões. É o nível mais alto de maturidade em sistemas de gestão." },
  ],
};
