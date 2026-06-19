import { baseConsultoria } from "./_base.js";

export default {
  ...baseConsultoria,
  slug: "lgpd",
  hero: {
    titulo: ["Do diagnóstico à certificação — com consultores experientes e ", "tecnologia", " que acelera cada etapa."],
    sub: "Certificamos sua empresa com garantia em contrato.",
    preco: "",
  },
  paraQuem: [
    { icon: "solar:code-square-bold", t: "Tecnologia e software" },
    { icon: "solar:cart-large-2-bold", t: "E-commerce e varejo" },
    { icon: "solar:health-bold", t: "Saúde e clínicas" },
    { icon: "solar:card-bold", t: "Serviços financeiros" },
    { icon: "solar:buildings-3-bold", t: "Educação" },
    { icon: "solar:case-round-bold", t: "Qualquer empresa que trate dados" },
  ],
  detalhes: {
    titulo: "A LGPD em detalhes",
    sub: "Lei Geral de Proteção de Dados: conformidade que protege a empresa e a confiança do cliente.",
    faq: [
      { q: "O que é a LGPD?", a: "É a Lei Geral de Proteção de Dados (Lei 13.709/2018), que regula o tratamento de dados pessoais por empresas e órgãos no Brasil." },
      { q: "A LGPD é obrigatória?", a: "Sim. Toda empresa que trata dados pessoais precisa estar em conformidade, sob risco de sanções da ANPD." },
      { q: "Quais são as sanções por descumprimento?", a: "Advertências, multas de até 2% do faturamento (limitadas a R$ 50 milhões por infração) e até a suspensão das atividades de tratamento." },
      { q: "Como adequar minha empresa à LGPD?", a: "Com mapeamento de dados, análise de riscos, políticas, contratos e medidas de segurança. A Templum conduz toda a adequação." },
      { q: "Preciso de um DPO?", a: "A lei exige um encarregado (DPO). Ajudamos a estruturar essa função, inclusive como serviço (DPO as a service)." },
      { q: "Como a LGPD se relaciona com a ISO 27001?", a: "A ISO 27001 fornece os controles de segurança da informação que sustentam boa parte das exigências técnicas da LGPD." },
      { q: "Quais são os benefícios da adequação?", a: "Segurança jurídica, proteção contra multas, mais confiança dos clientes e diferencial competitivo." },
    ],
  },
  motivos: [
    { t: "Obrigação legal com risco real de multa", d: "A LGPD é lei desde 2020 e a ANPD aplica sanções: advertências, multas de até 2% do faturamento (limitadas a R$ 50 mi por infração) e suspensão do tratamento de dados. Adequação não é opcional." },
    { t: "Evitar vazamentos com custo altíssimo", d: "Um incidente de dados pode gerar multas, ações judiciais, perda de clientes e dano irreparável à reputação. A adequação à LGPD reduz a probabilidade — e a responsabilidade — caso algo aconteça." },
    { t: "Diferencial em vendas B2B e processos de due diligence", d: "Empresas que tratam dados de clientes corporativos são cada vez mais avaliadas na sua conformidade com LGPD. Adequação bem documentada acelera fechamentos e elimina objeções jurídicas." },
    { t: "Confiança do cliente como ativo de marca", d: "Consumidores e usuários preferem empresas que tratam seus dados com transparência. Política de privacidade clara e conformidade real constroem confiança — e reduzem churn." },
    { t: "Exigência em contratos com grandes empresas", d: "Contratos com bancos, fintechs, operadoras de saúde e empresas de tecnologia já incluem cláusulas de conformidade com LGPD. Sem adequação, sua empresa não passa pela homologação jurídica." },
    { t: "Proteção contra responsabilidade solidária", d: "Quem trata dados de terceiros responde solidariamente por incidentes causados pela cadeia. Adequação formalizada com contratos de dados protege sua empresa de pagar pelo erro do parceiro." },
    { t: "Base para certificação ISO 27001", d: "A LGPD e a ISO 27001 se complementam: a norma fornece os controles de segurança que sustentam as exigências técnicas da lei. Adequar-se à LGPD é o primeiro passo natural para a certificação." },
    { t: "Governança que organiza a empresa por dentro", d: "O processo de adequação mapeia todos os fluxos de dados, elimina redundâncias, cria políticas claras e define responsabilidades. O resultado vai além da conformidade: a empresa fica mais organizada." },
  ],
};
