// Rodada 01 do H1 das LPs de fundo de funil.
// O HTML do servidor sempre entrega a variante 1 (controle).
// O sorteio roda no navegador, com uma chave por página e rodada.
//
// estado, por página:
//   inativo      não sorteia; a página mostra o controle
//   em_execucao  sorteia 1 de 5 e grava no navegador
//   encerrado    mostra variante_fixa para todo mundo
//
// Publicar o site com em_execucao liga o sorteio em produção.
// Ao mudar o texto de uma rodada já publicada, abra outra rodada.
// Não reutilize o mesmo experimento_id.

const TRAVO = "\u2014";

function v(n, angulo, antes, destaque, depois) {
  return { n, angulo, antes, destaque, depois: depois || "" };
}

export const H1_EXPERIMENTOS = {
  iso9001: {
    lp_id: "iso9001",
    experimento_id: "tpl_h1_iso9001_r01",
    rodada: "r01",
    estado: "em_execucao",
    variante_fixa: null,
    variantes: [
      v(1, "controle", "Consultoria e certificação ISO 9001 de forma ", "simples e ágil"),
      v(2, "exigencia", "Seu cliente exige ISO 9001? ", "Prepare sua empresa com a Templum"),
      v(3, "execucao", "Consultoria ISO 9001 com ", "documentos elaborados pela Templum"),
      v(4, "proposta", "Receba sua proposta para a certificação ", "ISO 9001"),
      v(5, "metodo", "Consultoria ISO 9001 com ", "especialistas e Templum OS", " em cada etapa"),
    ],
  },
  iso27001: {
    lp_id: "iso27001",
    experimento_id: "tpl_h1_iso27001_r01",
    rodada: "r01",
    estado: "em_execucao",
    variante_fixa: null,
    variantes: [
      v(1, "controle", "Da proposta à certificação ISO 27001 " + TRAVO + " com consultores experientes e ", "tecnologia", " que acelera cada etapa."),
      v(2, "exigencia", "Seu cliente exige ISO 27001? ", "Prepare sua empresa com a Templum"),
      v(3, "execucao", "Implemente a ISO 27001 com ", "consultor dedicado e suporte diário"),
      v(4, "beneficio", "ISO 27001 para ", "estruturar a segurança da informação", " da sua empresa"),
      v(5, "proposta", "Receba sua proposta para a certificação ", "ISO 27001"),
    ],
  },
  pbqph: {
    lp_id: "pbqph",
    experimento_id: "tpl_h1_pbqph_r01",
    rodada: "r01",
    estado: "em_execucao",
    variante_fixa: null,
    variantes: [
      v(1, "controle", "Da proposta à certificação PBQP-H " + TRAVO + " com consultores experientes e ", "tecnologia", " que acelera cada etapa."),
      v(2, "exigencia", "Sua construtora precisa do PBQP-H? ", "Prepare-se com a Templum"),
      v(3, "execucao", "Consultoria PBQP-H com ", "documentos elaborados para a realidade da sua construtora"),
      v(4, "beneficio", "Implemente o PBQP-H para ", "organizar processos e reduzir retrabalho na obra"),
      v(5, "proposta", "Receba a proposta para certificar sua construtora no ", "PBQP-H"),
    ],
  },
  sassmaq40: {
    lp_id: "sassmaq40",
    experimento_id: "tpl_h1_sassmaq40_r01",
    rodada: "r01",
    estado: "em_execucao",
    variante_fixa: null,
    variantes: [
      v(1, "controle", "Sua transportadora está preparada para a certificação ", "SASSMAQ 4.0", "?"),
      v(2, "exigencia", "Adeque sua transportadora ao SASSMAQ 4.0 com ", "apoio até a auditoria"),
      v(3, "proposta", "Receba a proposta para adequar sua transportadora ao ", "SASSMAQ 4.0"),
      v(4, "execucao", "Prepare ", "frota, motoristas e evidências", " para a avaliação SASSMAQ 4.0"),
      v(5, "metodo", "SASSMAQ 4.0 com ", "especialistas e Templum OS", " na adequação da sua operação"),
    ],
  },
  iso37001: {
    lp_id: "iso37001",
    experimento_id: "tpl_h1_iso37001_r01",
    rodada: "r01",
    estado: "em_execucao",
    variante_fixa: null,
    variantes: [
      v(1, "controle", "Consultoria e certificação ", "ISO 37001,", " o sistema de gestão antissuborno"),
      v(2, "exigencia", "Seu cliente exige ISO 37001? ", "Prepare sua empresa com a Templum"),
      v(3, "execucao", "Implemente a ISO 37001 com ", "apoio para estruturar seus controles antissuborno"),
      v(4, "beneficio", "ISO 37001 para ", "organizar responsabilidades e fortalecer a prevenção ao suborno"),
      v(5, "proposta", "Receba sua proposta para a certificação ", "ISO 37001"),
    ],
  },
  iso42001: {
    lp_id: "iso42001",
    experimento_id: "tpl_h1_iso42001_r01",
    rodada: "r01",
    estado: "em_execucao",
    variante_fixa: null,
    variantes: [
      v(1, "controle", "Consultoria e certificação ", "ISO 42001:", " a inteligência artificial da sua empresa sob governança"),
      v(2, "exigencia", "Seu cliente pede evidências de governança de IA? ", "Prepare-se para a ISO 42001"),
      v(3, "execucao", "Implemente a ISO 42001 com ", "apoio para organizar processos, controles e evidências"),
      v(4, "beneficio", "ISO 42001 para ", "definir responsabilidades e gerir os riscos da IA"),
      v(5, "proposta", "Receba sua proposta para a certificação ", "ISO 42001"),
    ],
  },
};

export function experimentoH1(lpId) {
  return H1_EXPERIMENTOS[lpId] || null;
}

export function configCliente(exp) {
  if (!exp) return null;
  return {
    lp_id: exp.lp_id,
    experimento_id: exp.experimento_id,
    estado: exp.estado,
    variante_fixa: exp.variante_fixa || null,
    variantes: (exp.variantes || []).map((item) => ({
      n: item.n,
      angulo: item.angulo,
      antes: item.antes,
      destaque: item.destaque,
      depois: item.depois || "",
    })),
  };
}
