// =============================================================================
// STACK DE REFERÊNCIA — a conta dos seis sistemas que a Templum desligou.
//
// Fonte única: lida por /lp/templum-os (tabela completa, com memória de cálculo)
// e por /solucoes-de-ia (versão compacta, ao lado dos planos). Mudou um valor?
// Muda aqui, e as duas páginas mudam juntas.
// =============================================================================

// A fatura de referência. ⚠️ LEIA ANTES DE PUBLICAR:
// - UNIDADE: a copy fala em MENSAL (decisão de 25/08/2026). O preço que o cliente
//   paga é mensal, então comparar R$ 10.103/mês com R$ 1.998/mês é maçã com maçã e
//   tira a multiplicação por 12 da cabeça de quem está lendo o anúncio. O anual
//   continua onde ele é total e está rotulado: coluna da tabela e bloco de economia.
// - O desligamento dos seis é REAL. O número da manchete é o TOTAL DESTA TABELA
//   (faturaAno), não a nota fiscal da Templum — decisão de 25/08/2026: manchete e
//   tabela têm de bater, senão o leitor pergunta de onde saiu o número.
// - Os valores linha a linha NÃO são a nota fiscal da Templum: são preço público de
//   tabela dos fornecedores, dimensionado para uma empresa de 50 pessoas (o mesmo
//   corte do preço fixo do Templum OS, para a comparação ficar maçã com maçã).
//   Isso está dito na página, em letra visível, de propósito — número de custo sem
//   memória de cálculo é o tipo de coisa que o lead confere na call.
// - Câmbio usado: R$ 5,50/US$. Fontes (ago/2026): Pipedrive Professional US$ 49/
//   usuário/mês anual; ClickUp Business US$ 12/usuário/mês anual; RD Station
//   Marketing Pro a partir de R$ 1.499/mês; Omie Avançado R$ 295/mês (5 usuários) +
//   módulos; Sólides sob consulta (faixa de mercado por colaborador); Clicksign Plus
//   R$ 59/mês com 10 usuários + R$ 15 por usuário adicional (preço da própria página
//   de planos da Clicksign).
// - ⚠️ MAILCHIMP SAIU DESTA CONTA EM 25/08/2026. A Templum CONTINUA usando — o
//   worker.js ainda cadastra todo lead na lista. Estava na tabela como desligado, o
//   que era falso, e o site é a primeira coisa que um prospect confere. Por isso
//   e-mail marketing em massa também saiu da lista do que a plataforma substitui:
//   dizer que o cliente pode cancelar o que nós mantemos não sobrevive à primeira
//   pergunta na call. Virou argumento a favor — a página passou a dizer o que NÃO
//   substitui, que é o que dá crédito ao resto.
// - Rodrigo: confira cada linha contra a fatura real antes do deploy. Se alguma
//   estourar ou faltar, o ajuste é só aqui.
export const fatura = [
  { sistema: "Pipedrive",            logo: "pipedrive", cat: "CRM e funil de vendas",   base: "US$ 49 por usuário/mês · 10 comerciais", mes: 2695, agora: "CRM, funil, atividades e coaching comercial" },
  { sistema: "ClickUp",              logo: "clickup",   cat: "Tarefas, projetos e prazos", base: "US$ 12 por usuário/mês · 50 usuários",  mes: 3300, agora: "Projetos, fases, tarefas, checklists e automações" },
  { sistema: "RD Station Marketing", logo: "rdstation", cat: "Automação de marketing",  base: "Plano Pro, a partir de R$ 1.499/mês",    mes: 1499, agora: "Landing pages, réguas de relacionamento e WhatsApp" },
  { sistema: "Sólides",              logo: "solides",   cat: "RH e gestão de pessoas",  base: "Sob consulta · faixa por colaborador",   mes: 1500, agora: "Cargos, avaliação, PDI, teste comportamental e recrutamento" },
  { sistema: "Omie",                 logo: "omie",      cat: "ERP e financeiro",        base: "Avançado R$ 295/mês + módulos",          mes: 900,  agora: "Contas a pagar e receber, DRE, fluxo de caixa, NF-e e NFS-e" },
  { sistema: "Clicksign",            logo: "clicksign", cat: "Assinatura eletrônica",   base: "Plus R$ 59 (10 usuários) + 10 a R$ 15",  mes: 209,  agora: "Envio, assinatura e cobrança da pendência no próprio documento" },
];

export const faturaMes = fatura.reduce((s, f) => s + f.mes, 0);  // R$ 10.103/mês
export const faturaAno = faturaMes * 12;                          // R$ 121.236/ano
