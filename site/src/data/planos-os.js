// =============================================================================
// PLANOS DO TEMPLUM OS — fonte única de preço.
//
// Mudou o preço? Muda AQUI. A página /solucoes-de-ia (planos e preços) lê tudo
// daqui: cards, tabela comparativa, custo por pessoa, schema.org e FAQ.
//
// ⚠️ O QUE É "POR USUÁRIO" AQUI. Os planos NÃO cobram por assento: o preço é
// fixo por faixa de usuários. O "custo por pessoa" que a página mostra é um
// número DERIVADO (mensalidade ÷ limite da faixa) e existe porque é o único jeito
// de comparar maçã com maçã contra CRM, gestor de tarefas e RH, que cobram por
// cabeça. Nunca escrever "R$ X por usuário" como se fosse a cobrança — escrever
// "custo por pessoa" ou "equivale a".
//
// ⚠️ MENSAL x ANUAL. O anual tem 20% de desconto e é cobrado por 12 meses — ou
// seja, o anual TEM compromisso de 12 meses e o mensal é que não tem fidelidade.
// Por isso o preço-âncora das páginas (manchete, title, schema e comparação com o
// stack) é sempre o MENSAL: é o único que pode andar ao lado de "cancele quando
// quiser". O equivalente mensal do anual (`anoMes`) só aparece rotulado como tal,
// dentro do card e do FAQ. A /lp/templum-os importa PLANO_ENTRADA daqui — nenhuma
// das duas páginas tem preço digitado.
//
// ⚠️ CONFERÊNCIA DA TABELA PÚBLICA (27/08/2026): o riscado do plano anual do
// Performance na página de preços atual mostra R$ 47.931/ano, mas 3.994 × 12 =
// R$ 47.928. Aqui o riscado é sempre calculado (mensal × 12), nunca digitado.
// =============================================================================

export const DESCONTO_ANUAL = 0.20;

export const planos = [
  {
    id: "essencial",
    nome: "Essencial",
    usuarios: 50,
    mes: 2497,       // cobrança mensal, sem fidelidade
    anoMes: 1998,    // equivalente mensal do plano anual
    anoTotal: 23971, // total cobrado no plano anual
    resumo:
      "Para a empresa que quer estruturar processo e passar a decidir por indicador, não por opinião.",
    para: "Times até 50 pessoas",
    suporte: "Horário comercial",
    destaques: [
      "Todos os módulos de gestão",
      "Olívia e os agentes de IA inclusos",
      "Suporte em horário comercial",
    ],
  },
  {
    id: "performance",
    nome: "Performance",
    usuarios: 100,
    mes: 3994,
    anoMes: 3196,
    anoTotal: 38352,
    recomendado: true,
    resumo:
      "Para a empresa em crescimento, com mais de uma área disputando prioridade e pressa em ver resultado.",
    para: "Times até 100 pessoas",
    suporte: "Prioritário",
    destaques: [
      "Tudo do Essencial",
      "Prioridade no suporte especializado",
      "O dobro de usuários por 60% a mais",
    ],
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    usuarios: 300,
    mes: 8994,
    anoMes: 7195,
    anoTotal: 86343,
    resumo:
      "Para operação distribuída: várias unidades, times grandes e muita gente precisando do mesmo dado ao mesmo tempo.",
    para: "Times até 300 pessoas",
    suporte: "Prioritário",
    destaques: [
      "Tudo do Performance",
      "Robustez para operação distribuída",
      "Menor custo por pessoa da linha",
    ],
  },
];

// --- Derivados (nunca digitar à mão) -----------------------------------------
export const brl = (n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
export const brl2 = (n) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const planosCalc = planos.map((p) => ({
  ...p,
  anoCheio: p.mes * 12,                 // riscado do plano anual
  economiaAno: p.mes * 12 - p.anoTotal, // quanto o anual devolve
  porPessoaMes: p.mes / p.usuarios,     // custo por pessoa, cobrança mensal
  porPessoaAno: p.anoMes / p.usuarios,  // custo por pessoa, plano anual
}));

export const PLANO_ENTRADA = planosCalc[0];
export const APP_REGISTER = "https://app.templum.com.br/register";
