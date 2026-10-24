// Troca só os cards compartilhados que as LPs desta rodada renderizam.
// As páginas institucionais de consultoria continuam com o texto original.

export function passosDaProposta(passos) {
  return (passos || []).map((passo) => {
    if (passo.t !== "Cronograma sob medida") return passo;
    return {
      ...passo,
      t: "Proposta sob medida",
      d: "Montamos a proposta conforme a realidade da empresa e estruturamos o passo a passo para atender os requisitos.",
    };
  });
}

export function porquesDaProposta(porques) {
  return (porques || []).map((item) => {
    if (item.t !== "Apoio total") return item;
    return {
      ...item,
      d: "Da proposta à auditoria externa, acompanhamos cada fase do processo.",
    };
  });
}
