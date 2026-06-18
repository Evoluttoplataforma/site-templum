import { baseConsultoria } from "./_base.js";

export default {
  ...baseConsultoria,
  slug: "fssc-22000",
  hero: {
    titulo: ["Do diagnóstico à certificação — com consultores experientes e ", "tecnologia", " que acelera cada etapa."],
    sub: "Certificamos sua empresa com garantia em contrato.",
    preco: "",
  },
  paraQuem: [
    { icon: "solar:donut-bitten-bold", t: "Indústria de alimentos" },
    { icon: "solar:bottle-bold", t: "Bebidas" },
    { icon: "solar:box-bold", t: "Embalagens para alimentos" },
    { icon: "solar:chef-hat-bold", t: "Food service" },
    { icon: "solar:leaf-bold", t: "Agroindústria" },
    { icon: "solar:delivery-bold", t: "Armazenagem e transporte" },
  ],
  detalhes: {
    titulo: "A FSSC 22000 em detalhes",
    sub: "Esquema de certificação de segurança de alimentos reconhecido pela GFSI.",
    faq: [
      { q: "O que é a FSSC 22000?", a: "É um esquema de certificação de segurança de alimentos reconhecido pela GFSI, baseado na ISO 22000 somada a programas de pré-requisitos e requisitos adicionais." },
      { q: "Qual é o objetivo principal da FSSC 22000?", a: "Garantir a segurança dos alimentos ao longo de toda a cadeia, prevenindo riscos físicos, químicos e biológicos." },
      { q: "Quem deve implementar a FSSC 22000?", a: "Indústrias de alimentos, bebidas, embalagens e empresas da cadeia que precisam de reconhecimento internacional." },
      { q: "A FSSC 22000 é obrigatória?", a: "Não por lei, mas é exigida por grandes redes e exportadores como condição para fornecer." },
      { q: "Como a FSSC 22000 se relaciona com o HACCP e a ISO 22000?", a: "Ela incorpora os princípios do HACCP e a estrutura da ISO 22000, adicionando os PPRs e requisitos do esquema." },
      { q: "Quais são os benefícios da implementação?", a: "Acesso a grandes mercados e exportação, redução de riscos sanitários e fortalecimento da marca." },
      { q: "Como obter a certificação FSSC 22000?", a: "Implantando o sistema conforme o esquema e passando por auditoria de um organismo certificador. A Templum conduz todo o processo." },
      { q: "Qual é a validade da certificação?", a: "3 anos, com auditorias de manutenção anuais." },
    ],
  },
};
