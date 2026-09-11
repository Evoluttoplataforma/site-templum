# ManyChat — PE2027 (workshop 10/09/2026, 15h)

Disparo **T-24h: 09/09 às 15h**. Dois públicos, três templates, uma régua de mensagens livres.
Evento: workshop ao vivo e **gratuito**, ~3h, Zoom em sala fechada, com Igor Furniel, mão na
massa **dentro do Templum OS**.

> ⚠️ O e-mail `email-cupom-pe2027-planejamento-estrategico.html` (R$197, cupom PE2027) é material
> morto — o workshop deixou de ser pago no commit `65eac78`. Nenhuma peça abaixo cita preço.

---

## 0. A regra que decide o fluxo inteiro: a janela de 24h

O que você chamou de "aproveitar a janela do many" é literalmente o eixo do desenho:

1. **Fora da janela** de 24h (a base fria, e os inscritos de agosto), o WhatsApp só aceita
   **template aprovado**. Mensagem livre é bloqueada pelo próprio provedor.
2. **Botão de URL não abre a janela.** Só o **quick reply** abre: o toque no botão conta como
   mensagem do lead. Por isso **nenhum template abaixo tem link** — o link vai na mensagem
   seguinte, que já é livre e gratuita.
3. **Cada resposta do lead reinicia as 24h.** Toda etapa da régua termina pedindo um toque —
   é assim que o link do Zoom chega às 14h45 de quinta sem gastar um segundo template.

Consequência prática: um template só (o de T-24h) sustenta toda a comunicação até o fim do
evento, para quem responder. Quem não responder precisa do Template 3.

---

## 1. Públicos e segmentação no ManyChat

| # | Público | Filtro | Peça |
|---|---|---|---|
| **A** | Inscritos no workshop | tem tag `PE2027` | Template 1 |
| **B** | Base Templum não inscrita | tem tag (`webserie_ISO9001`, `lp9001`, `lp14001`, `lp27001`, `lp45001`, `lpsgi`, `lpesg`, `lplgpd`…) **E não** tem `PE2027` **E não** tem `PE2027_optout` | Template 2 |
| **C** | Inscritos que não responderam ao Template 1 | tem `PE2027` **E não** tem `PE2027_lembrete_ok` | Template 3 |

A tag `PE2027` já é aplicada automaticamente na inscrição (`site/worker.js:721`). Confira o total
da tag antes de disparar — em agosto eram ~59.

### Tags a criar (5)

| Tag | Quando é aplicada | Serve para |
|---|---|---|
| `PE2027_lembrete_ok` | tocou qualquer botão do Template 1 | excluir do Template 3 |
| `PE2027_conta_criada` | confirmou conta no Templum OS | público que chega pronto — e quem falta |
| `PE2027_quer_vaga` | base tocou "Quero minha vaga" | remarketing e follow-up do comercial |
| `PE2027_optout` | tocou "Não dessa vez" | nunca mais disparar sobre este evento |
| `PE2027_zoom_enviado` | recebeu o link do Zoom | evitar link duplicado às 15h05 |

Campos personalizados: nenhum novo. `Empresa`, `cargo`, `CF_email` já existem e já vêm do form.

---

## 2. Linha do tempo

| Quando | Público | Peça | Tipo |
|---|---|---|---|
| **09/09 15h00** | A | Template 1 — lembrete + tarefa de casa | template |
| **09/09 15h02** | A que tocou botão | F1 / F1c — link do cadastro | livre |
| **09/09 16h30** | B (em lotes) | Template 2 — última chamada | template |
| **09/09 20h00** | tocou "manda o link" e não confirmou | F1-lembrete | livre |
| **10/09 09h30** | `PE2027_quer_vaga` sem inscrição | F2-lembrete | livre |
| **10/09 12h00** | A com janela aberta | F3 — checklist (renova a janela) | livre |
| **10/09 13h00** | C (sem janela) | Template 3 — é hoje | template |
| **10/09 14h45** | A com janela | F4 — link do Zoom | livre |
| **10/09 15h10** | A sem `PE2027_zoom_enviado` clicado | F5 — estamos ao vivo | livre |
| **11/09 10h00** | A | F6 — pós-evento (gancho comercial) | livre |

---

## 3. Templates para submeter agora

Formatação WhatsApp: `*negrito*`. Variável `{{1}}` = primeiro nome. Ao submeter, preencha o
exemplo da variável (ex.: `Marcos`) — template sem exemplo é reprovado direto.

### Template 1 — `pe2027_lembrete_24h`
**Categoria:** Utility · **Idioma:** pt_BR · **Header:** texto — `Seu workshop é amanhã, às 15h`

```
Oi, {{1}}! Amanhã, *quinta (10/09), às 15h*, acontece o workshop Planejamento Estratégico 2027, com o Igor Furniel.

Um recado antes: este workshop é *mão na massa*. Você não vai assistir — vai construir o planejamento da sua empresa ao vivo, dentro do Templum OS.

Para isso funcionar, você precisa chegar com *a conta já criada* e estar *no computador* (pelo celular não dá conta das 3 horas).

Criar a conta leva 2 minutos. Quer que eu te mande o link agora?
```
**Footer:** `Templum Consultoria` · **Botões (quick reply):** `Sim, manda o link` · `Já tenho conta`

> Utility se sustenta porque é aviso operacional de um evento em que a pessoa se inscreveu. Se o
> Meta reprovar a categoria, **reenvie o mesmo texto como Marketing** — a copy serve nas duas.

### Template 2 — `pe2027_ultima_chamada`
**Categoria:** Marketing · **Idioma:** pt_BR · **Header:** nenhum

```
Oi, {{1}}, tudo bem? Aqui é a Templum.

Amanhã, *quinta (10/09), às 15h*, o Igor Furniel conduz o workshop *Planejamento Estratégico 2027* — ao vivo e gratuito.

Não é palestra: são cerca de 3 horas construindo o plano da *sua* empresa. SWOT, objetivos, indicadores, processos e a cadência de reunião que impede o plano de morrer em fevereiro.

As vagas são limitadas porque o Igor acompanha cada participante ao vivo — e ainda temos algumas abertas.

Quer que eu garanta a sua?
```
**Footer:** `Responda SAIR para não receber mais` · **Botões (quick reply):** `Quero minha vaga` · `Não dessa vez`

### Template 3 — `pe2027_hoje_15h`
**Categoria:** Utility · **Idioma:** pt_BR · **Header:** texto — `É hoje, às 15h`

```
Oi, {{1}}! Seu workshop de Planejamento Estratégico 2027 é *hoje, às 15h* — sala fechada no Zoom, cerca de 3 horas.

Duas coisas para deixar prontas: *conta criada no Templum OS* e *estar no computador*, porque a maior parte do tempo é você construindo o seu plano.

Toque no botão e eu te mando o link do Zoom e o passo do cadastro aqui mesmo.
```
**Footer:** `Templum Consultoria` · **Botões (quick reply):** `Quero o link do Zoom` · `Não vou conseguir ir`

---

## 3.1. O botão "Bloquear agenda"

Já está no ar (depois do próximo deploy): **`https://templum.com.br/pe2027.ics`** — arquivo
`site/public/pe2027.ics`, evento de **10/09, 15h às 18h (BRT)**, com três alarmes embutidos:
24h antes ("sua conta no Templum OS já está criada?"), 1h antes e 15min antes.

| Destino | Onde usar | Comportamento |
|---|---|---|
| `templum.com.br/pe2027.ics` | **WhatsApp** (é curto e funciona em tudo) | iPhone abre a prévia "adicionar ao calendário"; Android/desktop baixa e o app de calendário importa |
| Link do Google Calendar | e-mail e páginas web | abre o evento já preenchido, sem download — mas a URL é gigante, ruim no WhatsApp |
| Página de obrigado | quem acabou de se inscrever | os 3 botões já estão lá: Google, Outlook e Apple/outros |

Os alarmes do `.ics` são um segundo canal de lembrete que não gasta template e não depende da
janela de 24h — vale insistir nele em toda mensagem de confirmação.

> ⚠️ **Se a data ou o horário mudarem**, reescreva o arquivo *e* incremente o `SEQUENCE`. Ainda
> assim, quem já baixou não recebe a atualização (é `METHOD:PUBLISH`, não convite de organizador):
> a correção teria de ser avisada na mão.

> ⚠️ **Em template, botão de URL não abre a janela de 24h** — só quick reply abre. Por isso o
> "Bloquear agenda" aparece apenas nas mensagens livres, depois que a pessoa já respondeu. Não
> troque um quick reply do Template 1 por ele.

---

## 4. Régua de mensagens livres (dentro da janela)

### F1 — botão "Sim, manda o link"
*Ações: + `PE2027_lembrete_ok`*

```
Toma aí 👇

*1.* Acesse: {{LINK_OS}}
*2.* Crie a conta com o *mesmo e-mail* da inscrição
*3.* Confirme o e-mail e pronto

Não precisa configurar nada — o Igor guia tudo ao vivo. Quando terminar, me avisa aqui.
```
**Botões:** `Conta criada ✅` · `Deu problema`

### F1c — botão "Já tenho conta"
*Ações: + `PE2027_lembrete_ok`, + `PE2027_conta_criada`*

```
Ótimo, então do seu lado já está tudo certo.

📅 Amanhã, quinta 10/09
🕒 15h de Brasília — reserve ~3 horas
💻 No computador, Zoom em sala fechada

Bloqueia na agenda agora, pra reunião nenhuma cair em cima: templum.com.br/pe2027.ics

O link do Zoom eu te mando aqui, 15 minutos antes.

Só me conta uma coisa: você vai construir o plano de qual empresa?
```
*(A pergunta aberta faz três coisas: renova a janela por mais 24h, preenche o campo `Empresa` quando está vazio e entrega contexto pro time comercial.)*

### F1a — botão "Conta criada ✅"
*Ações: + `PE2027_conta_criada`*

```
Perfeito, {{first_name}}. Você está pronto.

📅 Bloqueia sua agenda em 1 toque (10/09, 15h às 18h):
templum.com.br/pe2027.ics

E se quiser acompanhar os avisos junto com os outros inscritos, o grupo do evento é este:
https://chat.whatsapp.com/GX5PMW1rT2hLWXSrgoIGOr

Amanhã, 15h. Te espero lá.
```
**Se o seu builder do WhatsApp oferecer botão de URL:** `📅 Bloquear agenda` → `https://templum.com.br/pe2027.ics`. Se não oferecer, o link solto no texto já basta — o WhatsApp transforma em link clicável sozinho.

### F1b — botão "Deu problema"
*Ações: notificar admin / atribuir conversa a um humano*

```
Sem estresse. Me conta em uma frase o que apareceu na tela — pode mandar print. Alguém do time resolve com você ainda hoje.
```

### F1-lembrete — 09/09, 20h · tocou "manda o link" e não tem `PE2027_conta_criada`

```
{{first_name}}, deu tempo de criar a conta?

É o único preparo que o workshop de amanhã exige — 2 minutos: {{LINK_OS}}

Quem chega sem conta perde os primeiros 20 minutos do mão na massa configurando, e essa parte não volta.
```
**Botões:** `Já criei` · `Faço agora`

### F2 — botão "Quero minha vaga" (base)
*Ações: + `PE2027_quer_vaga`*

```
Boa decisão, {{first_name}}. A inscrição leva 1 minuto:

https://templum.com.br/planejamento-estrategico-2027?utm_source=manychat&utm_medium=whatsapp&utm_campaign=pe2027_ultima_chamada

Assim que sua inscrição cair no sistema, eu te mando aqui o passo do Templum OS — porque o workshop é mão na massa e você precisa chegar com a conta criada.

⚠️ É amanhã, 15h. A sala fecha e não tem replay.
```
**Botões:** `Já me inscrevi`

### F2a — botão "Não dessa vez"
*Ações: + `PE2027_optout`*

```
Tranquilo, e obrigado por responder — não te mando mais nada sobre este evento.

Se mudar de ideia até amanhã às 14h, escreve *vaga* aqui que eu te encaixo.
```
*Configure a keyword `vaga` → entra em F2.*

### F2b — automação por gatilho: **tag `PE2027` adicionada**
Pega todo mundo que se inscreve pela LP daqui em diante, tenha vindo do WhatsApp ou não.

```
Inscrição confirmada, {{first_name}}! 🎉

Falta um passo, e ele é importante: criar sua conta no Templum OS. É lá dentro que você vai construir o seu planejamento ao vivo.

{{LINK_OS}}

Leva 2 minutos. Me avisa quando estiver feito.

📅 E bloqueia a agenda: templum.com.br/pe2027.ics (10/09, 15h às 18h)
```
**Botões:** `Conta criada ✅` · `Preciso de ajuda`

### F3 — 10/09, 12h · público A com janela aberta
*Esta é a mensagem que renova a janela para o link do Zoom caber às 14h45.*

```
{{first_name}}, é hoje às *15h*. 🚀

Checklist de 30 segundos:
✅ Conta no Templum OS criada
✅ Computador (não celular)
✅ ~3 horas na agenda, sem reunião em cima
✅ Um lugar quieto — você vai escrever bastante

Está de pé para hoje?
```
**Botões:** `Confirmado, estarei lá` · `Não vou conseguir`

### F4 — 10/09, 14h45 · link do Zoom
*Ações: + `PE2027_zoom_enviado`*

```
Sala aberta, {{first_name}}. Entra por aqui:

{{LINK_ZOOM}}

Começamos 15h em ponto — melhor entrar agora e já deixar o Templum OS numa segunda aba.
```

### F5 — 10/09, 15h10 · quem recebeu e não clicou

```
Estamos ao vivo, {{first_name}}. O Igor já passou o contexto e agora começa o mão na massa — que é justamente a parte que não dá para recuperar depois.

{{LINK_ZOOM}}
```

### F6 — 11/09, 10h · pós-evento

```
E aí, {{first_name}}, conseguiu fechar seu planejamento de 2027 ontem?
```
**Botões:** `Terminei 🎯` · `Travei em uma parte` · `Não consegui participar`

- `Travei em uma parte` → conversa para humano/Olívia. É o lead mais quente do funil: tem plano começado dentro do OS e sabe exatamente onde emperrou.
- `Não consegui participar` → régua de próxima turma.

---

## 5. Plano B — se o template não aprovar até quinta às 14h

Aprovação de template leva de minutos a ~24h, e Marketing é a categoria mais revisada. Se não
sair em tempo:

1. **Grupo de WhatsApp dos inscritos** (`GX5PMW1rT2hLWXSrgoIGOr`) — mensagem no grupo não passa
   por template. É o canal mais rápido para o público A.
2. **E-mail** — o Mailchimp cobre A e B sem restrição. Base pronta no repo:
   `email-pe2027-grupo-whatsapp.html` (adaptar o miolo para lembrete + cadastro no OS).
3. **DM do Instagram no ManyChat** — janela de 24h também, mas sem exigência de template.
4. **Ligação** para os inscritos de maior porte (`n_funcionarios` 101+) — é o público que
   justifica o esforço manual.

---

## 6. Higiene do número (o Template 2 é o risco)

- Dispare a base em **lotes de ~500 por hora**, não tudo de uma vez.
- Só entre **9h e 20h**.
- **Não insista com template** em quem ignorou o Template 2 — segunda tentativa sem resposta é o
  que derruba a nota de qualidade do número. Quem não respondeu fica com e-mail.
- Respeite `PE2027_optout` e configure a keyword `SAIR` do rodapé.

---

## 7. Pendências para fechar antes de amanhã 15h

- [ ] **`{{LINK_OS}}`** — URL de cadastro no Templum OS (você disse que tem o link específico).
- [ ] **`{{LINK_ZOOM}}`** — link da sala.
- [ ] Submeter os 3 templates (Template 1 primeiro — é o que sustenta a régua toda).
- [ ] Criar as 5 tags.
- [x] ~~Link de calendário~~ — `templum.com.br/pe2027.ics` (vai no ar no próximo deploy)
- [ ] Conferir o volume real da tag `PE2027` e das tags de produto do público B.
