/**
 * insert-post.mjs — insere um post no Supabase via service_role (ignora RLS).
 * Uso: SUPABASE_SERVICE_KEY=<sua-chave> node insert-post.mjs
 *
 * Apague este arquivo após publicar.
 */

const SB_URL = "https://yfpdrckyuxltvznqfqgh.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SB_KEY) {
  console.error("❌  Defina SUPABASE_SERVICE_KEY antes de rodar.");
  console.error("   Exemplo: SUPABASE_SERVICE_KEY=xxx node insert-post.mjs");
  process.exit(1);
}

const post = {
  title: "ISO 9001:2026: as 6 principais mudanças da FDIS (e a minha análise)",
  slug: "iso-9001-2026-principais-mudancas-fdis",
  seo_title: "ISO 9001:2026: as 6 principais mudanças da FDIS (e a minha análise)",
  seo_description:
    "A FDIS da ISO 9001:2026 trouxe o texto final da norma. Veja as 6 principais mudanças (cultura da qualidade, riscos e oportunidades e mais) analisadas uma a uma.",
  seo_keywords: [
    "ISO 9001:2026",
    "mudanças ISO 9001:2026",
    "FDIS ISO 9001",
    "cultura da qualidade ISO 9001",
    "riscos e oportunidades ISO 9001:2026",
    "gestão de mudanças ISO 9001",
    "Anexo A ISO 9001:2026",
    "IA na ISO 9001",
  ],
  category_id: "94802fc7-6dfd-4677-8054-e7092a3d5f91",
  category_name: "Qualidade e Inovação",
  author_name: "Daniela Albuquerque",
  status: "published",
  published_at: new Date().toISOString(),
  reading_time_min: 7,
  excerpt:
    "No mês passado foi publicada a FDIS da ISO 9001:2026, a última versão antes da publicação final. Neste primeiro post de uma série semanal, compilamos as principais mudanças apontadas pela própria FDIS com análise de cada uma.",
  content: `<p>No mês passado foi publicada a FDIS da ISO 9001:2026, a última versão antes da publicação final. A partir daqui, dá para falar em mudanças de verdade. Neste primeiro post de uma série semanal, eu compilo as principais mudanças da ISO 9001:2026 apontadas pela própria FDIS e comento cada uma. Nos próximos textos, aprofundo ponto a ponto.</p>

<h2>O que é a FDIS da ISO 9001:2026 (e por que já dá para falar em mudanças)</h2>

<p>FDIS é a sigla para <em>Final Draft International Standard</em>: a última etapa antes da publicação. Nesta fase, o texto não muda mais. A votação (aberta até 09/07) serve apenas para aprovar, ou não, a publicação. Se a norma não for aprovada, o processo recomeça do zero, com um novo <em>work draft</em>.</p>

<p>Com o texto final já definido, sinceramente não vejo motivo para a mudança não ser aprovada. Por isso, decidi publicar semanalmente a minha análise desta nova versão, usando como base as mudanças que o próprio documento cita como principais.</p>

<h2>As 6 principais mudanças da ISO 9001:2026</h2>

<h3>1. Termos e definições essenciais na Cláusula 3</h3>

<p>A Cláusula 3 passa a incluir um número limitado de termos e definições, e a ISO 9000 continua sendo a referência normativa para todos os termos da qualidade.</p>

<p>O que achei estranho: tanto nessa Cláusula 3 quanto na ISO 9000:2026 há a definição de risco, mas não há definição de oportunidade, justo nesta versão que separa os dois conceitos, como veremos adiante. Na definição de risco, o texto segue falando em efeitos positivos ou negativos, com uma nota dizendo que "a palavra 'risco' é, algumas vezes, utilizada quando existe a possibilidade apenas de consequências negativas". Acredito que essa ausência vai fazer falta no entendimento geral do que se espera da nova abordagem de oportunidades.</p>

<h3>2. Cultura da qualidade e comportamento ético</h3>

<p>A cultura da qualidade e o comportamento ético passam a ser tratados nos requisitos, especialmente em relação à liderança, à conscientização e ao ambiente para a operação dos processos.</p>

<p>Para mim, apesar de ser a mudança mais celebrada desta revisão, é também o ponto mais frágil. A definição de cultura da qualidade (na ISO 9000:2026) diz: <em>"A cultura da qualidade organizacional refere-se aos valores, crenças, histórico, atitudes e comportamentos observados, compartilhados pelas pessoas dentro de uma organização."</em> Ou seja: existe um aspecto subjetivo nessa observação. E o texto continua: <em>"Evidências do comprometimento da alta direção com a promoção de uma cultura da qualidade organizacional são essenciais."</em></p>

<p>Isso me deixa especialmente curiosa para entender como os auditores vão tratar essa evidência de cultura da qualidade. Será que começaremos a ter auditorias não anunciadas também na ISO 9001, para entender melhor o dia a dia da empresa? Fica a provocação, e o tema de um próximo post.</p>

<h3>3. Separação entre riscos e oportunidades</h3>

<p>Riscos e oportunidades passam a ser claramente distinguidos, com consideração separada das ações para tratar cada um.</p>

<p>De todas as mudanças, esta é a que tem o meu coração. Enquanto o risco já foi bem incorporado pelas empresas, a oportunidade virava confusão: não era raro confundirem oportunidade com melhoria. Vou aprofundar em outro post, mas vale destacar: oportunidade é uma ocasião propícia para executar ou implementar uma ação que te leva mais perto do seu objetivo estratégico. Pode ser uma melhoria, sim, mas também pode ser algo novo: uma parceria, um novo produto, uma nova linha. Assim como tínhamos o pensamento baseado no risco, ter agora o pensamento baseado em oportunidade pode ser um <em>game changer</em> importante, para a empresa que olhar este novo requisito com carinho.</p>

<h3>4. Gestão de mudanças fortalecida</h3>

<p>Os requisitos relacionados às mudanças no sistema de gestão da qualidade foram reforçados para apoiar o alcance dos resultados pretendidos.</p>

<p>Agora o item de planejamento de mudanças tem 3 novas alíneas: a comunicação das mudanças, o monitoramento e a avaliação da eficácia das mudanças, e como os resultados serão analisados. Particularmente, gosto bastante dessas inclusões. Muitas vezes este item era preenchido perto da auditoria, de proforma, porque a empresa lembrava de uma mudança e fazia o registro só para constar. Quando falamos de comunicação e análise de resultado, não dá para "criar registro para a auditoria": não há como forjar evidência de comunicação sistemática. Isso também leva a empresa a um pensamento mais sistêmico em relação ao sistema.</p>

<p>Sinceramente, o profissional da qualidade que vive "correndo atrás" da informação tem aqui uma grande oportunidade (já usando o conceito desta nova versão) de trazer a qualidade para perto das decisões estratégicas, e, com isso, levar a qualidade de vez para o <em>board</em> da empresa.</p>

<h3>5. Anexo A com conteúdo explicativo aprimorado</h3>

<p>O Anexo A foi revisado para oferecer esclarecimentos sobre a estrutura, a terminologia e a intenção dos requisitos, como texto informativo, sem introduzir requisitos adicionais.</p>

<h3>6. Remoção do Anexo B</h3>

<p>O antigo Anexo B trazia informações sobre outras normas do ISO/TC 176. Essas referências agora estão no Anexo A e no site do ISO/TC 176.</p>

<p>Gosto de ter um único anexo: para o entendimento geral da norma, achei que ficou bem mais didático e as explicações estão boas, com exceção do item A.4.3 (Escopo), que sinceramente achei confuso. Também trarei este assunto em mais detalhe adiante.</p>

<h2>ISO 9001:2026 e Inteligência Artificial: cuidado com a desinformação</h2>

<p>Já vi várias publicações afirmando que a nova versão "inclui Inteligência Artificial". Aqui vai um alerta importante: <strong>não há requisito nem nota sobre IA nos requisitos da ISO 9001:2026</strong>.</p>

<p>O que existe está no Anexo A, nos itens A.7.1.3 e A.7.1.4, que tratam de tecnologias emergentes como critério de infraestrutura e de operação dos processos, indicando que elas trazem riscos e oportunidades para a operação. Ou seja: nada de sair fazendo POP de inteligência artificial. Não que o tema não seja relevante (é relevantíssimo), mas precisa ser tratado com a seriedade que ele tem no nosso contexto de trabalho, e não como um espantalho.</p>

<h2>O que vem na série</h2>

<p>Este é o primeiro post de uma série semanal em que aprofundo cada uma dessas mudanças da ISO 9001:2026. Nos próximos textos, começo a destrinchar ponto a ponto: da cultura da qualidade às auditorias, passando pela separação entre riscos e oportunidades.</p>

<p>Qual dessas mudanças você quer que eu aprofunde primeiro?</p>

<p><em>Qualidade além da norma.</em></p>`,
};

const res = await fetch(`${SB_URL}/rest/v1/blog_templum_posts`, {
  method: "POST",
  headers: {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify(post),
});

if (!res.ok) {
  const err = await res.text();
  console.error("❌  Erro ao inserir:", res.status, err);
  process.exit(1);
}

const data = await res.json();
console.log("✅  Post publicado com sucesso!");
console.log("   ID:", data[0]?.id);
console.log("   Slug:", data[0]?.slug);
console.log("   URL: https://certificacaoiso.com.br/" + data[0]?.slug + "/");
console.log("\n⚠️   Lembre de apagar este arquivo: rm insert-post.mjs");
console.log("⚠️   E de disparar o rebuild do blog para o post aparecer.");
