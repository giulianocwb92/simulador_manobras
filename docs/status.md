# Estado atual do projeto

> Última atualização: 2026-07-27. `origin/main` está em `7972f95` (inclui a refatoração de
> edição de manobra + preview de PDF + numeração automática descrita abaixo, já commitada e
> enviada). A working tree tem, além disso, a incorporação de elementos provisórios permanentes
> (fecha o último item pendente da FASE 5) implementada e testada nesta sessão, **ainda não
> commitada** ("nunca commite — só implemente e reporte" segue valendo até pedido em contrário).
> Este documento é um retrato do progresso — para o checklist vivo, ver `docs/implementation-plan.md`.

## Resumo

FASES 1 a 9 do `implementation-plan.md` estão completas — a FASE 5 acaba de fechar (item
pendente de incorporação de provisórios permanentes, ver seção própria). Falta só a FASE 10
(polimento e entrega). Commitada e em `origin/main` também está uma refatoração ad-hoc grande do
fluxo de manobra (numeração automática, responsabilidade LOCAL/CENTRO por passo, preview de PDF
inline, tela dedicada de edição).

## O que existe e funciona

**Backend** (`backend/app/`): FastAPI + SQLAlchemy 2.0 async + Alembic, com routers `users`,
`substations` (CRUD, lock/unlock com timeout de 30min, versionamento) e `maneuvers` (CRUD,
passos com reorder, finalize, clone, PDF). `maneuver_service.py` monta o contexto do PDF e
renderiza via Jinja2 + WeasyPrint.

**Frontend** (`frontend/src/`): React 18 + Vite + `@xyflow/react` + Zustand + React Query,
com react-router (`/`, `/substations/:id`, `/manobras`, `/manobras/:id`, `/manobras/:id/editar`,
`/manobras/:id/pdf`) e `@dnd-kit` pro drag-and-drop de passos. Editor de topologia
completo com 12 tipos de nó (`frontend/src/nodes/`: Barra unificada, DJ, CH, TF, TF3,
Religador, TP, TC, Linha, Jumper, Chave Provisória, mais o `EquipmentNodeShell` compartilhado),
ferramenta de wire estilo LTSpice, rotação (Ctrl+R), propagação de cor no modo GRAVANDO,
painel de manobra (cabeçalho, passos, histórico) e página de histórico com filtros/clone.

**Testes**: 20 testes unitários no backend (`pytest`, lock service + schemas). Frontend
validado manualmente via Playwright (sem suíte automatizada ainda — é item aberto da FASE 10).

## Incorporação de elementos provisórios permanentes (2026-07-27, não commitada)

Fecha o item pendente da FASE 5. `handleFinalizeManeuver` em `SubstationEditorPage.tsx` agora
filtra a topologia antes de persistir: `utils/provisionalElements.ts` (`incorporatePermanentProvisionals`)
remove os nós `jumper`/`chave_provisoria` com `data.permanente === false` (e as edges que
ficariam penduradas neles) — o que sobra (equipamento normal + provisórios `permanente: true`)
é salvo via `PUT /substations/{id}` **antes** de chamar `POST /maneuvers/{id}/finalize`; se o
PUT falhar, a manobra não é finalizada (evita marcar como finalizada uma manobra cuja topologia
não foi persistida). Cobre só a SE principal — a secundária (`secondaryIds`) é somente
leitura/toggle nesta tela (FASE 6) e não tem como ganhar um provisório novo por aqui, já que a
`Toolbar` (onde se arrasta um jumper/chave provisória) só aparece em modo CONFIGURAÇÃO, que edita
exclusivamente a SE principal. Elementos temporários continuam visíveis no canvas local até a
página recarregar (não é removido do estado do React Flow, só não é persistido).

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
  ação — o badge de origem (`MANUAL`) foi tirado da UI (`StepBadges.tsx`) e do PDF; o campo
  `origin` continua existindo no modelo (só não é mais exibido).
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
  Ctrl+R. Wires são ortogonais (`type: "step"`) e herdam cor da barra fonte, com propagação
  dinâmica (BFS a partir de barras `fonte: true`) só no modo GRAVANDO.
- Lock de edição: liberado em `beforeunload` (via `fetch keepalive`) e ao navegar para fora da
  página; timeout automático de 30min no backend.
- `ManeuverRead.header.substations` é derivado da relação `ManeuverSubstation` real (não do
  texto livre do formulário) — bug corrigido durante a FASE 9.

## Estrutura de pastas

Ver `CLAUDE.md` para a árvore completa. Sem mudanças estruturais relevantes desde a criação —
`frontend/src/nodes/`, `frontend/src/components/{editor,maneuver}/`, `frontend/src/utils/` e
`backend/app/{api,models,schemas,services}/` cresceram organicamente dentro do padrão original.

## Próximo passo natural

FASE 10 (polimento e entrega) — é a única fase que resta em aberto no `implementation-plan.md`.
