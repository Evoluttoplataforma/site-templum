// Base compartilhada das páginas de consultoria (método, garantia, stats, cobertura).
// Cada norma faz: export default { ...baseConsultoria, slug, hero, paraQuem, detalhes }
// (não tem `slug` → o roteador ignora este arquivo).
export const baseConsultoria = {
  garantiaPadrao: "Ao concluir todas as etapas da nossa consultoria e ainda assim não obter a certificação, devolvemos 200% do valor investido.",
  chipsPadrao: ["30 anos de experiência", "Sem limite de horas", "Resultados comprovados"],
  stats: [
    { num: "+2.000", label: "clientes certificados" },
    { num: "+1,5 mi", label: "de interações com especialistas" },
    { num: "R$ 3,3 bi", label: "em ganhos gerados aos clientes" },
    { num: "4,9", label: "de nota no Google" },
  ],
  passos: [
    { t: "Cronograma sob medida", d: "Calculamos seu cronograma conforme o diagnóstico da empresa e estruturamos o passo a passo para atender os requisitos." },
    { t: "Documentos feitos por nós", d: "Nunca delegamos a você o que deve ser feito por nós. Elaboramos os documentos da forma mais útil para o seu negócio." },
    { t: "Checkpoints e ritmo", d: "Você dita o ritmo e passa por checkpoints obrigatórios do consultor. Um método à prova de falhas." },
    { t: "Especialistas sempre disponíveis", d: "Todos os dias, em horário comercial, você tira dúvidas com seu consultor em tempo real." },
    { t: "Selo reconhecido pelo mercado", d: "Enquanto implementa, emitimos um selo e um atestado para comprovar ao mercado o status da sua implantação." },
    { t: "Garantia em contrato", d: "Se passar por todos os processos e ainda assim não certificar, devolvemos 200% do seu investimento." },
    { t: "Estrutura robusta", d: "Uma estrutura de especialistas apaixonados pelo sucesso do cliente acompanhando você de perto." },
  ],
  porques: [
    { icon: "solar:medal-star-bold", t: "Experiência comprovada", d: "Mais de 30 anos atuando exclusivamente com sistemas de gestão." },
    { icon: "solar:shield-check-bold", t: "Garantia real", d: "Devolvemos o dobro do investimento se a sua empresa não conquistar o certificado." },
    { icon: "solar:hand-heart-bold", t: "Apoio total", d: "Do diagnóstico à auditoria externa, acompanhamos cada fase do processo." },
  ],
  cobertura: "Nossa consultoria é 100% online, atendendo empresas em mais de 800 cidades no Brasil, Portugal e África.",
  incluso: [
    "Consultor dedicado, sem limite de horas",
    "Plataforma Orbit para organizar toda a gestão",
    "Todos os documentos elaborados por nós",
    "Suporte diário com especialistas em horário comercial",
    "Selo “Estamos Implementando” para exibir ao mercado",
    "Garantia de 200% registrada em contrato",
  ],
};

// setores genéricos reutilizáveis
export const setoresGerais = [
  { icon: "solar:factory-bold", t: "Indústria e manufatura" },
  { icon: "solar:case-round-bold", t: "Serviços e consultorias" },
  { icon: "solar:cart-large-2-bold", t: "Comércio e distribuição" },
  { icon: "solar:buildings-2-bold", t: "Construção civil" },
  { icon: "solar:code-square-bold", t: "Tecnologia e software" },
  { icon: "solar:health-bold", t: "Saúde e laboratórios" },
];
