// LP de dupla certificação ISO 9001 + ISO 14001.
// SEM `slug` de propósito: o roteador de /consultoria/[slug] monta as páginas a
// partir dos arquivos que têm slug, e esta combinação existe só como LP (não há
// foto em /assets/img/consultoria/ para a página institucional).
import { baseConsultoria } from "./_base.js";

export default {
  ...baseConsultoria,
  hero: {
    titulo: [
      "Certifique ISO 9001 e ISO 14001 em uma ",
      "única implantação",
      ".",
    ],
    sub: "Duas certificações, um só sistema de gestão — com consultores experientes, tecnologia que acelera cada etapa e garantia em contrato.",
    preco: "",
  },
  paraQuem: [
    { icon: "solar:factory-bold", t: "Indústria e manufatura" },
    { icon: "solar:buildings-2-bold", t: "Construção civil" },
    { icon: "solar:delivery-bold", t: "Logística e transporte" },
    { icon: "solar:leaf-bold", t: "Agronegócio" },
    { icon: "solar:bolt-bold", t: "Energia e utilities" },
    { icon: "solar:case-round-bold", t: "Serviços e comércio" },
  ],
  detalhes: {
    titulo: "ISO 9001 + ISO 14001 em detalhes",
    sub: "Qualidade e meio ambiente operando como um sistema só — sem documento duplicado e sem retrabalho.",
    faq: [
      {
        q: "Por que implantar ISO 9001 e ISO 14001 juntas?",
        a: "Porque as duas normas compartilham a mesma Estrutura de Alto Nível (Anexo SL): contexto, liderança, riscos e oportunidades, competência, documentação, auditoria interna, análise crítica e melhoria são requisitos comuns. Implantadas juntas, essa base é construída uma única vez em vez de duas.",
      },
      {
        q: "Preciso ter a ISO 9001 antes de buscar a ISO 14001?",
        a: "Não. Você pode implantar as duas ao mesmo tempo, do zero. Se já tiver a ISO 9001, melhor ainda: aproveitamos todo o sistema existente e acrescentamos só a parte ambiental.",
      },
      {
        q: "A auditoria de certificação é uma só?",
        a: "As normas são certificadas individualmente, mas a auditoria é combinada — o mesmo organismo certificador audita os dois escopos na mesma visita. Isso reduz o custo e o tempo de parada da equipe em relação a duas auditorias separadas.",
      },
      {
        q: "Quanto tempo leva para certificar nas duas?",
        a: "Depende do porte, do número de processos e da situação ambiental da empresa. No diagnóstico gratuito montamos um cronograma sob medida — e o prazo das duas juntas é bem menor do que a soma de dois projetos separados.",
      },
      {
        q: "Sai mais caro do que certificar só na ISO 9001?",
        a: "O investimento é maior do que o de uma norma isolada, mas bem menor do que o de dois projetos independentes: boa parte da implantação, dos documentos e das auditorias é compartilhada.",
      },
      {
        q: "Que documentos ficam compartilhados entre as duas normas?",
        a: "Política, análise de contexto e partes interessadas, matriz de riscos e oportunidades, controle de documentos e registros, competência e treinamento, auditoria interna, tratamento de não conformidades e análise crítica pela direção.",
      },
      {
        q: "Qual é a validade dos certificados?",
        a: "Três anos para cada norma, com auditorias de manutenção anuais — que também podem ser combinadas.",
      },
      {
        q: "Dá para incluir a ISO 45001 depois?",
        a: "Sim, e é o caminho natural. Com 9001 e 14001 integradas, acrescentar a ISO 45001 (saúde e segurança) e fechar um SGI completo exige muito menos esforço do que começar do zero.",
      },
    ],
  },
  motivos: [
    {
      t: "Duas certificações sem dobrar o trabalho",
      d: "ISO 9001 e ISO 14001 compartilham a Estrutura de Alto Nível: contexto, liderança, riscos, competência, auditoria interna e melhoria são construídos uma vez e valem para as duas. Você não faz dois projetos — faz um, com dois resultados.",
    },
    {
      t: "Auditorias combinadas custam menos",
      d: "Em vez de duas auditorias de certificação e duas manutenções por ano, o organismo audita os dois escopos na mesma visita. Menos dias de auditoria, menos custo recorrente e menos parada da equipe.",
    },
    {
      t: "Abre os contratos que exigem as duas",
      d: "Montadoras, mineradoras, grandes construtoras, redes de varejo e licitações públicas costumam pedir qualidade e gestão ambiental no mesmo edital. Ter só uma das duas deixa a empresa de fora da concorrência.",
    },
    {
      t: "Um único conjunto de rotinas para a equipe",
      d: "Procedimentos, registros e treinamentos duplicados são o que faz sistema de gestão morrer na prática. Integrados, os processos entram na rotina de quem executa em vez de virar burocracia paralela.",
    },
    {
      t: "Conformidade legal ambiental sob controle",
      d: "A ISO 14001 obriga o mapeamento dos requisitos legais aplicáveis e o controle dos aspectos e impactos ambientais. Menos risco de multa, embargo e perda de licença de operação — com a disciplina de processo que a 9001 já instala.",
    },
    {
      t: "Menos desperdício, menos retrabalho, menos custo",
      d: "A qualidade ataca o retrabalho; a gestão ambiental ataca o consumo de energia, água e a geração de resíduos. Juntas, as duas atacam as duas maiores fontes de custo escondido da operação.",
    },
    {
      t: "Base auditada para a agenda ESG",
      d: "A ISO 14001 é o pilar ambiental de qualquer estratégia ESG séria, e a ISO 9001 dá a evidência de que os processos são controlados. Relatórios de sustentabilidade deixam de ser discurso e passam a ter lastro auditado.",
    },
    {
      t: "Caminho aberto para o SGI completo",
      d: "Com as duas integradas, somar a ISO 45001 depois é incremento, não um novo projeto. A empresa fica com um sistema único de gestão em vez de três sistemas paralelos que ninguém consegue manter.",
    },
  ],
  beneficios: [
    "Um só diagnóstico, um só cronograma e um só consultor para as duas normas",
    "Documentação integrada — sem procedimento duplicado para qualidade e meio ambiente",
    "Auditoria interna e análise crítica combinadas",
    "Levantamento de requisitos legais ambientais aplicáveis à sua operação",
    "Preparação para a auditoria conjunta do organismo certificador",
    "Garantia de 200% em contrato, valendo para as duas certificações",
  ],
};
