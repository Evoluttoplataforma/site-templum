import { baseConsultoria, setoresGerais } from "./_base.js";

export default {
  ...baseConsultoria,
  slug: "iso-9001",
  hero: {
    titulo: ["Certificado na ", "ISO 9001", " ou receba 2x o investimento de volta"],
    sub: "Certifique sua empresa na ISO 9001 em até 90 dias, com garantia em contrato.",
    preco: "A partir de R$ 2.500/mês, com acompanhamento completo do início ao fim.",
  },
  paraQuem: setoresGerais,
  detalhes: {
    titulo: "A ISO 9001 em detalhes",
    sub: "Sistemas de gestão da qualidade para empresas dos mais diversos ramos de atividade e tamanho.",
    faq: [
      { q: "O que é a ISO 9001?", a: "É a norma internacional de Sistemas de Gestão da Qualidade. Define requisitos para padronizar processos, reduzir falhas e entregar produtos e serviços com qualidade consistente." },
      { q: "Qual é o objetivo principal da ISO 9001?", a: "Garantir a satisfação do cliente por meio de uma gestão da qualidade eficaz, com melhoria contínua e decisões baseadas em evidências." },
      { q: "Quais são os benefícios da implementação da ISO 9001?", a: "Mais eficiência operacional, menos retrabalho, acesso a grandes contratos e licitações, e uma gestão mais previsível e escalável." },
      { q: "Quais são os principais elementos da ISO 9001?", a: "Contexto da organização, liderança, planejamento, suporte, operação, avaliação de desempenho e melhoria — no ciclo PDCA." },
      { q: "Como obter a certificação ISO 9001?", a: "Implantando o sistema de gestão conforme a norma e passando por auditoria de um organismo certificador acreditado. A Templum conduz do diagnóstico à auditoria." },
      { q: "A certificação ISO 9001 é obrigatória?", a: "Não é obrigatória por lei, mas é frequentemente exigida por clientes, licitações e cadeias de fornecimento como prova de qualidade." },
      { q: "Qual é a validade da certificação ISO 9001?", a: "O certificado vale 3 anos, com auditorias de manutenção anuais para garantir que o sistema continua eficaz." },
      { q: "Quem pode usar a ISO 9001?", a: "Qualquer empresa, de qualquer porte ou setor, que queira organizar a gestão e elevar a qualidade dos seus produtos e serviços." },
    ],
  },
};
