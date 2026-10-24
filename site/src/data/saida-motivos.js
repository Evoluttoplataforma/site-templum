// Textos do popup de saída. A oferta "proposta" vale só nas LPs desta rodada.
// As outras páginas continuam com o texto padrão.

const motivosPadrao = {
  pesquisando: {
    label: "Ainda estou só pesquisando",
    pergunta: "O que ainda falta para você decidir?",
    fecho: "Quando a prioridade apertar, o diagnóstico mostra o caminho. Sem compromisso nessa conversa.",
    cta: false,
    detalhes: [
      ["comparar", "Quero comparar com outras consultorias"],
      ["prazo", "Quero entender o prazo até certificar"],
      ["estudando", "Só estou estudando a norma"],
    ],
  },
  preco: {
    label: "Queria o preço antes de cadastrar",
    pergunta: "O que você precisava ver sobre o preço?",
    fecho: "O diagnóstico não tem custo. O valor do projeto só entra na proposta, depois da conversa.",
    cta: true,
    detalhes: [
      ["faixa", "Queria uma faixa de investimento antes de falar com alguém"],
      ["caro", "Achei que ia ser caro demais"],
      ["diretoria", "Preciso levar um número para a diretoria"],
    ],
  },
  depois: {
    label: "Não ficou claro o que acontece depois",
    pergunta: "O que ficou confuso?",
    fecho: "Quem pede o diagnóstico recebe uma conversa com um especialista. Sem contrato nessa etapa.",
    cta: true,
    detalhes: [
      ["ligacao", "Não quero que alguém me ligue agora"],
      ["tempo", "Não entendi quanto tempo leva o diagnóstico"],
      ["compromisso", "Não ficou claro se tem custo ou compromisso"],
    ],
  },
  momento: {
    label: "Não é o momento da minha empresa",
    pergunta: "O que te fez deixar para depois?",
    fecho: "Tudo bem adiar. Quando fizer sentido, o diagnóstico continua no topo da página.",
    cta: false,
    detalhes: [
      ["prioridade", "A certificação ainda não é prioridade"],
      ["contrato", "Estou esperando um contrato ou uma licitação"],
      ["equipe", "Falta gente na equipe para tocar isso"],
    ],
  },
  confianca: {
    label: "Faltou confiança para deixar meus dados",
    pergunta: "O que faltou para você confiar?",
    fecho: "A garantia está em contrato: se a empresa cumprir as etapas e não certificar, devolvemos 200% do valor.",
    cta: true,
    detalhes: [
      ["cases", "Queria ver cases do meu setor"],
      ["marca", "Não conhecia a Templum"],
      ["garantia", "A garantia não ficou clara"],
    ],
  },
  formulario: {
    label: "O formulário pediu coisa demais",
    pergunta: "O que pesou na hora de preencher?",
    fecho: "Se o formulário pesou, a gente vai enxugar. O cadastro existe para um especialista te responder.",
    cta: true,
    detalhes: [
      ["telefone", "Pediu telefone cedo demais"],
      ["campos", "Eram muitos campos"],
      ["whatsapp", "Prefiro chamar no WhatsApp"],
    ],
  },
  falar: {
    label: "Quero falar com alguém antes de cadastrar",
    pergunta: "Como você prefere continuar?",
    fecho: "Dá para pedir o diagnóstico e a conversa começa por ali. Sem contrato nessa etapa.",
    cta: true,
    detalhes: [
      ["ligar", "Prefiro que alguém me explique por telefone"],
      ["whatsapp_agora", "Prefiro continuar no WhatsApp"],
      ["reuniao", "Quero marcar uma conversa, sem formulário"],
    ],
  },
  ja_tem: {
    label: "Já estou resolvendo a certificação",
    pergunta: "Em que ponto você está?",
    fecho: "Se quiser um segundo olhar, o diagnóstico continua no topo da página.",
    cta: false,
    detalhes: [
      ["consultoria", "Já tenho uma consultoria"],
      ["processo", "Já começamos a certificação"],
      ["interno", "Vamos tocar isso com a equipe interna"],
    ],
  },
  curiosidade: {
    label: "Entrei por curiosidade, não para contratar",
    pergunta: "O que você buscava nesta página?",
    fecho: "Obrigado por dizer. O diagnóstico fica no topo, se um dia a empresa for contratar.",
    cta: false,
    detalhes: [
      ["conteudo", "Queria conteúdo, não um cadastro"],
      ["anuncio", "O anúncio me trouxe, mas não era isso"],
      ["norma_solta", "Queria só entender a norma"],
    ],
  },
  outro: {
    label: "Outro motivo",
    pergunta: "Conta em uma frase o que te fez sair.",
    fecho: "Obrigado por escrever. Isso entra no ajuste da página.",
    cta: false,
    detalhes: [],
  },
};

function motivosProposta() {
  const motivos = JSON.parse(JSON.stringify(motivosPadrao));
  motivos.pesquisando.fecho = "Quando a prioridade apertar, a proposta mostra o caminho. Sem compromisso nessa conversa.";
  motivos.preco.fecho = "A conversa para montar a proposta não tem custo. O valor do projeto só entra na proposta, depois da conversa.";
  motivos.depois.fecho = "Quem pede a proposta recebe uma conversa com um especialista. Sem contrato nessa etapa.";
  motivos.depois.detalhes = motivos.depois.detalhes.map((item) => (
    item[0] === "tempo" ? ["tempo", "Não entendi quanto tempo leva até a proposta"] : item
  ));
  motivos.momento.fecho = "Tudo bem adiar. Quando fizer sentido, a proposta continua no topo da página.";
  motivos.falar.fecho = "Dá para pedir a proposta e a conversa começa por ali. Sem contrato nessa etapa.";
  motivos.ja_tem.fecho = "Se quiser um segundo olhar, a proposta continua no topo da página.";
  motivos.curiosidade.fecho = "Obrigado por dizer. A proposta fica no topo, se um dia a empresa for contratar.";
  return motivos;
}

export function copiaSaida(oferta) {
  if (oferta === "proposta") {
    return {
      motivos: motivosProposta(),
      subSaida: "Você ia sair sem pedir a proposta. Qual frase é a sua?",
      ctaPedir: "Pedir a proposta",
      ctaTopo: "Se mudar de ideia, a proposta está no topo da página",
    };
  }
  return {
    motivos: motivosPadrao,
    subSaida: "Você ia sair sem pedir o diagnóstico. Qual frase é a sua?",
    ctaPedir: "Pedir o diagnóstico",
    ctaTopo: "Se mudar de ideia, o diagnóstico está no topo da página",
  };
}
