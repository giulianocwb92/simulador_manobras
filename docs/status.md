# Estado atual do projeto

> Última atualização: 2026-07-27. Esta sessão implementou as 6 frentes de
> `docs/refatorar_manobras.md` (bugfix de propagação de cor, home/navegação, sessão de manobra
> efêmera, limpeza de backend, template de PDF, voltar à gravação) — sendo commitada agora.
> Este documento é um retrato do progresso — para o checklist vivo, ver `docs/implementation-plan.md`.

## Resumo

FASES 1 a 9 do `implementation-plan.md` estão completas; FASE 10 (polimento) segue pendente. Por
cima disso, `docs/refatorar_manobras.md` foi implementado por inteiro nesta sessão — a mudança
mais profunda é a **FRENTE 2**: gravação de manobra deixou de acontecer dentro do editor de SE e
virou uma sessão efêmera separada (`/manobras/nova`), que nunca persiste topologia de volta no
banco. Isso reverte a feature de "incorporação de provisório permanente" que a FASE 5 tinha
fechado — ver seção própria abaixo.

## O que existe e funciona

**Backend** (`backend/app/`): FastAPI + SQLAlchemy 2.0 async + Alembic, com routers `users`,
`substations` (CRUD, lock/unlock com timeout de 30min, versionamento) e `maneuvers` (CRUD,
passos com reorder, finalize, reopen, clone, PDF). `maneuver_service.py` monta o contexto do PDF e
renderiza via Jinja2 + WeasyPrint.

**Frontend** (`frontend/src/`): React 18 + Vite + `@xyflow/react` + Zustand + React Query,
com react-router (`/`, `/substations`, `/substations/:id`, `/manobras`, `/manobras/nova`,
`/manobras/:id`, `/manobras/:id/editar`, `/manobras/:id/pdf`) e `@dnd-kit` pro drag-and-drop de
passos. `HomePage.tsx` (`/`) é o ponto de entrada, com 3 cards (Configuração de Subestações,
Manobras, Histórico — os dois últimos apontam pra `/manobras` por ora, ver FRENTE 0 abaixo).
Editor de topologia completo com 12 tipos de nó (`frontend/src/nodes/`: Barra unificada, DJ, CH,
TF, TF3, Religador, TP, TC, Linha, Jumper, Chave Provisória, mais o `EquipmentNodeShell`
compartilhado), ferramenta de wire estilo LTSpice, rotação (Ctrl+R), propagação de cor só a
partir de barras `fonte: true` (BFS unidirecional AT→BT através de TF, ver FRENTE 1), painel de
manobra (cabeçalho, passos, histórico) e página de histórico com filtros/clone.

`Canvas.tsx`/`Toolbar.tsx`/`WirePreview.tsx`/`useEditorShortcuts.ts` não importam mais uma store
específica — recebem os bindings de topologia (nós, arestas, wire tool, rotação) via prop
(`stores/topologyBindings.ts`), o que permite reuso tanto pelo cadastro de SE (`editorStore`)
quanto pela sessão de manobra (`sessionStore`, ver FRENTE 2).

**Testes**: 22 testes unitários no backend (`pytest`, lock service + schemas). Frontend
validado manualmente via Playwright a cada frente (sem suíte automatizada ainda — item aberto
da FASE 10).

## Refatoração de `docs/refatorar_manobras.md` (2026-07-27)

### FRENTE 0 — Home e navegação
Nova `HomePage.tsx` em `/`; a lista de SEs (antiga home) virou `/substations`. Os cards
"Manobras" e "Histórico" apontam pro mesmo `/manobras` por enquanto — só existe uma página de
manobras hoje (a de histórico, filtrada a `FINALIZADA`); vão divergir quando/se `/manobras`
ganhar uma listagem de rascunhos separada.

### FRENTE 1 — Bugfix propagação de cor
`utils/energization.ts`: o BFS agora só semeia a partir de barras com `data.fonte === true`
(antes, qualquer barra não-transferência virava fonte). TF/TF3 passaram a ser unidirecionais
(AT→BT) por padrão — novo campo `data.propagacaoReversa` (checkbox no modal de propriedades)
libera os dois sentidos só naquele transformador específico.

### FRENTE 2 — Sessão de manobra efêmera (a maior mudança)
Gravação de manobra **saiu** do editor de SE (que agora só cuida de cadastro/topologia
persistida, com lock+autosave como antes) e virou uma sessão separada, `ManeuverSessionPage.tsx`
(`/manobras/nova`, acessível pelo botão "Nova Sessão de Manobra" em `/manobras`):
- Fase 1: seleção multi-SE (checklist).
- Fase 2: canvas combinado — `sessionStore.ts` importa a topologia de cada SE selecionada como
  camada **read-only** (reposicionável/rotacionável, mas sem modal de propriedades nem remoção)
  e permite adicionar jumper/chave provisória e wires entre SEs como camada de sessão, **efêmera**.
  `PUT /substations/{id}` **nunca** é chamado neste fluxo — reimportar é sempre a partir do
  estado atual do banco.
- Modo MONTAGEM → GRAVANDO (clique em DJ/CH/Religador gera passo, prefixado `[SIGLA]` quando
  2+ SEs) → FINALIZADA (painel read-only, `POST /maneuvers/{id}/finalize`).
- **Reverte a feature de incorporação de provisório permanente da FASE 5** (decisão consciente,
  não um esquecimento): como a sessão nunca persiste topologia, um jumper/chave "permanente" não
  tem mais como ser incorporado à SE base. `utils/provisionalElements.ts` foi deletado e o campo
  `permanente` saiu de `JumperData`/`ChaveProvisoriaData` e do modal — elementos provisórios na
  sessão são sempre temporários, sem exceção.

### FRENTE 3c — Remove `ManeuverStepOrigin`
O enum `origin` (`SIMULADOR`/`MANUAL`) foi removido por completo (model, schema, migration
`9fef7d796fa0`, frontend) — já era redundante com `action == null` significando "passo manual"
desde a refatoração anterior (badge de origem já não aparecia na UI).

### FRENTE 4c — Voltar à Gravação
Só existe dentro da fase FINALIZADA do `ManeuverSessionPage` (é a única tela com o canvas efêmero
ainda vivo — `ManeuverEditPage` não tem canvas, ver FRENTE 4b). Botão abre modal com 2 opções:
- **Reiniciar topologia**: limpa passos, reseta a session store, reimporta as mesmas SEs do zero.
- **Nova gravação (sobrepor)**: mantém o canvas atual, limpa só os passos, vai direto pra
  GRAVANDO.

Sem versionamento de manobra: as duas opções reaproveitam o mesmo `maneuver_id` (só substituem os
passos in-place). Novo endpoint `POST /maneuvers/{id}/reopen` (`maneuver_service.reopen`) permite
reabrir uma manobra já FINALIZADA de volta pra RASCUNHO — sem isso, os passos antigos não
poderiam ser apagados nem novos inseridos (`assert_editable` bloqueia mutação em manobra
finalizada).

### FRENTE 5 — Template do PDF
Número e coluna de responsabilidade já apareciam (herdado da refatoração anterior). O espaçamento
entre a coluna responsabilidade/badge de ação e a descrição do passo dependia de `gap` do
flexbox, que o WeasyPrint usado aqui não aplica de forma confiável (sobretudo ao redor do
`::before` do contador numérico) — trocado por `margin`/`padding` explícitos, com uma coluna
`.meta` de largura fixa e borda divisória.

## Refatoração de edição de manobra (2026-07-27, commit `7972f95`)

- **Número automático**: nova coluna `Maneuver.number` (`"0001/2026"`, zero-padded + ano
  corrente), atribuída em `maneuver_service.assign_number` no primeiro `PUT /maneuvers/{id}`
  que muda algo (header/title/status) — nunca reatribuído depois. `UniqueConstraint` +
  `.with_for_update()` + retry em `IntegrityError` cobrem concorrência (mesmo espírito do fix de
  race condition do lock de SE, ver "Decisões" abaixo). O campo `header.numero` (texto livre,
  nunca preenchido de verdade) foi **removido** do schema — substituído por esse `number`
  top-level, sempre somente leitura no frontend.
- **Responsabilidade por passo**: nova coluna `ManeuverStep.responsibility`
  (`LOCAL`/`CENTRO`, default `CENTRO`), editável via dropdown na tela de edição.
- **Badge "manual" removido**: um passo sem `action` (null) simplesmente não mostra badge de
  ação — o badge de origem (`MANUAL`) foi tirado da UI (`StepBadges.tsx`) e do PDF. O campo
  `origin` em si foi removido por completo do model/schema numa sessão posterior (FRENTE 3c,
  ver acima) — na época deste commit original ele só tinha parado de aparecer na UI.
- **PDF inline**: `GET /maneuvers/{id}/pdf` devolve `Content-Disposition: inline` (via
  `FileResponse(..., content_disposition_type="inline")`) em vez de `attachment` — nova rota de
  frontend `/manobras/:id/pdf` embute isso num `<iframe>` em tela cheia.
- **Painel lateral do editor virou somente leitura**: `StepsPanel.tsx` perdeu toda edição
  inline (texto, drag-reorder, form de passo manual, cabeçalho) — mostra só a lista com
  badges + botão excluir por passo, mais os botões "Editar Manobra" e "Visualizar PDF".
  `ManeuverHeaderForm.tsx` foi **deletado** (edição de cabeçalho não vive mais ali).
- **Nova tela `ManeuverEditPage.tsx`** (`/manobras/:id/editar`): cabeçalho editável (número
  somente leitura, data/responsável/área editáveis, subestações somente leitura), passos
  arrastáveis via `@dnd-kit` (nova dependência), inserir passo em qualquer posição, dropdown de
  responsabilidade, auto-save com debounce de 2s + botão "Salvar" que força o flush.
- `maneuverStore.ts` (Zustand) foi enxugado — `header`/`setHeader`/`updateStep`/`reorderSteps`
  saíram (só faziam sentido pro fluxo antigo de edição inline no painel); `ManeuverEditPage` não
  usa essa store, busca/gerencia estado próprio via React Query + estado local.
- `ManeuverDetailPage.tsx` (histórico) ganhou um botão "Editar" (só quando `status !==
  FINALIZADA`) e trocou "Baixar PDF" por "Visualizar PDF" apontando pra rota nova.
- Migration: `backend/alembic/versions/aad168c3900f_*.py` — atenção ao aplicar: `op.add_column`
  com `Enum` fora de `op.create_table` **não cria o tipo automaticamente** (diferente de
  `create_all`), por isso a migration chama `postgresql.ENUM(...).create(bind, checkfirst=True)`
  explicitamente antes do `add_column`. Sem isso dá `UndefinedObjectError` no Postgres.
- Testado via Playwright headless (Chromium): fluxo completo SE → gravar 2 passos → finalizar
  gravação → abrir edição → inserir passo, editar texto/responsabilidade, arrastar pra
  reordenar (confirmado tanto no DOM quanto via GET na API) → autosave "Salvo" → número
  `0001/2026` atribuído → PDF (`pdftotext` confirmou número + coluna de responsabilidade
  presentes no conteúdo renderizado). Suite `pytest` (22 testes) e `npm run typecheck`/`build`
  passando.

## Pendências conhecidas

- **FASE 10** (polimento): tratamento de erros global (toasts), loading states, responsividade
  básica, README de instalação (parcialmente já existe), `.env.example` documentado, teste de
  fluxo completo ponta a ponta.
- **PDF**: template em `backend/app/templates/maneuver.html` é **provisório** — aguardando
  modelo oficial da COPEL. `build_pdf_context` foi desenhado pra não precisar mudar quando o
  template oficial chegar.

## Decisões e divergências relevantes (não óbvias só lendo o código)

- `@xyflow/react` (não `reactflow`, que hoje é só shim de compatibilidade a partir do v12).
- Tailwind v4 via plugin do Vite, sem `tailwind.config.js`.
- Auto-save de topologia usa `PUT /substations/{id}` — `api-contracts.md` não define um PATCH
  dedicado como o `implementation-plan.md` antigo sugeria.
- Grid snap final: **6px** (não 10px nem 20px — 10px não divide os 12px de offset do terminal
  vertical dos componentes de 24px, causando cotovelos residuais nos wires).
- `BarraNode` é um único componente parametrizado por `tipo: principal | transferencia | dupla`
  (as versões antigas `BarraPrincipalNode`/`BarraTransferenciaNode`/`BarraDuplaNode` foram
  unificadas e não existem mais).
- Orientação padrão: barra vertical, DJ/CH/Religador/TF horizontais — tudo rotacionável com
  Ctrl+R. Wires são ortogonais (`type: "step"`) e herdam cor da barra fonte, com propagação BFS
  só a partir de barras `fonte: true` — TF/TF3 são unidirecionais (AT→BT) a menos que
  `data.propagacaoReversa` esteja marcado naquele transformador específico (FRENTE 1).
- Lock de edição: liberado em `beforeunload` (via `fetch keepalive`) e ao navegar para fora da
  página; timeout automático de 30min no backend. Só existe pro cadastro de SE — a sessão de
  manobra (FRENTE 2) não trava nenhuma SE, já que nunca escreve nelas.
- `ManeuverRead.header.substations` é derivado da relação `ManeuverSubstation` real (não do
  texto livre do formulário) — bug corrigido durante a FASE 9.
- Gravação de manobra não vive mais no editor de SE — é sempre uma sessão efêmera separada
  (`/manobras/nova`, FRENTE 2), que nunca persiste topologia de volta em `/substations`.

## Estrutura de pastas

Ver `CLAUDE.md` para a árvore completa. Sem mudanças estruturais relevantes desde a criação —
`frontend/src/nodes/`, `frontend/src/components/{editor,maneuver}/`, `frontend/src/utils/` e
`backend/app/{api,models,schemas,services}/` cresceram organicamente dentro do padrão original.

## Próximo passo natural

FASE 10 (polimento e entrega) — é a única fase que resta em aberto no `implementation-plan.md`.
