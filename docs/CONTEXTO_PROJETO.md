# Contexto — Simulador de Manobras (COPEL Distribuição)

> Gerado em 2026-07-22. Cole este arquivo no início de uma nova conversa para dar contexto completo do projeto.

## O que é

Sistema web para planejamento e documentação de manobras em subestações de distribuição, para engenheiros de pré-operação da COPEL Distribuição.

**Stack**: React 18 + TypeScript + Vite + React Flow (`@xyflow/react`) + Zustand (frontend) · Python 3.12 + FastAPI + SQLAlchemy 2.0 async (backend) · PostgreSQL 16 · WeasyPrint (PDF) · Docker Compose (3 containers).

Repositório: `/home/giuliano/Projetos/simulador_manobras`, branch `main`, sincronizado com `origin/main`.

**Working tree com mudanças não commitadas** (refatoração de símbolos do editor, ver abaixo) — não é um estado limpo como no snapshot anterior.

## Documentação de referência (já existe no repo, ler antes de mexer)

- `CLAUDE.md` — stack, comandos, estrutura de pastas, convenções
- `docs/architecture.md` — arquitetura geral, containers, banco de dados
- `docs/domain-model.md` — regras de negócio elétrico (tensões, nomenclatura DJ/CH/TF, fluxo de estados, lock)
- `docs/editor-topology.md` — spec original do editor React Flow (nós, handles, cores, validação de conexão) — **parcialmente superada** pela refatoração abaixo (símbolos, orientação horizontal, wire ortogonal)
- `docs/api-contracts.md` — contratos REST
- `docs/implementation-plan.md` — checklist passo a passo das FASES 1-10, fonte de verdade do progresso "oficial" (itens `[x]`) — **não cobre** a refatoração de símbolos, que foi um trabalho ad-hoc entre fases
- `docs/refatorar_simbolos.md` — spec da refatoração de símbolos em andamento (ver seção seguinte)

## Estado atual (2026-07-22)

**FASES 1 a 4 do `implementation-plan.md` concluídas, testadas via Docker/navegador, commitadas e em `origin/main`:**

| Fase | Conteúdo | Commit |
|------|----------|--------|
| 1 | Infra Docker (docker-compose, Dockerfiles, .env.example) | `e9c218e` |
| 2 | Backend: fundação (models, Alembic, schemas, lock/substations, 20 testes) | `11d6062` |
| 3 | Frontend: estrutura base (Vite, deps, stores, home page) | `3fae9d9` |
| 4 | Editor de topologia (React Flow, 8 tipos de nó, toolbar, lock visual, auto-save) | `a710bcd` |

### Trabalho em andamento — refatoração de símbolos do editor (não commitado)

Após a FASE 4, foi pedida uma refatoração visual do editor (spec completa em `docs/refatorar_simbolos.md`), fora da sequência do `implementation-plan.md`. Está **implementada mas ainda não commitada nem homologada pelo usuário** — a spec termina com "Não commite — avise quando terminar para revisão".

O que mudou (working tree atual, `git diff --stat`: 15 arquivos, +395/-142):

- **Orientação horizontal por padrão** em todos os símbolos (wire entra `terminal-a` LEFT, sai `terminal-b` RIGHT), exceto TP que é vertical por padrão.
- **Rotação com Ctrl+R**: campo `rotation: 0|90|180|270` em `data` de cada nó, `rotateSelectedNodes()` no `editorStore.ts`, botão ↻ na toolbar. Handles trocam de lado conforme a rotação (`useNodeRotation.ts`).
- **Wire ortogonal**: edges usam `type: "step"` do React Flow (`Canvas.tsx:61`), cor herdada da barra de origem via `VOLTAGE_COLORS`, branco/cinza (`#FFFFFF`/`#94a3b8`) quando não conectado.
- **Cores por tensão centralizadas** em `frontend/src/constants/voltageColors.ts` (novo arquivo) — todos os nós/edges devem usar essa constante, nunca hardcode.
- **Componentes novos**: `TF3Node.tsx` (transformador 3 enrolamentos, 3 handles incl. terciário), `BarraDuplaNode.tsx` (B1/B2 com DJ de acoplamento manual), `BarraTransferenciaNode.tsx` (barra de transferência, linha fina). Todos registrados em `nodes/index.ts` e na `Toolbar.tsx`.
- **Hooks novos**: `useBusHandles.ts` (handles dinâmicos de barra), `useNodeRotation.ts` (lógica de rotação/reposicionamento de handles).
- **Símbolos redesenhados em SVG inline** reproduzindo imagens de referência em `frontend/src/assets/referencias/` (disjuntor, chave seccionadora aberta/fechada, religador, TF 2 e 3 enrolamentos, TP, TC) — todos os `nodes/*.tsx` existentes (`DJNode`, `CHNode`, `ReligadorNode`, `TFNode`, `TPNode`, `TCNode`, `BarraNode`) e `connectionValidation.ts`, `PropertiesModal.tsx`, `types/topology.ts` foram tocados para suportar isso.
- **Script novo** `scripts/homologacao.sh`: sobe a stack via Docker (lidando com o workaround `sg docker`) e aguarda backend/frontend responderem, para facilitar a homologação manual desta refatoração.

**Pendente**: homologação manual no navegador pelo usuário (checklist de 8 itens no fim de `docs/refatorar_simbolos.md`: fidelidade visual dos símbolos, DJ/CH mudando de cor no modo GRAVANDO, cor de barra/wire por tensão, wire branco quando solto, Ctrl+R e botão ↻ rotacionando, TF3/Barra Dupla aparecendo na toolbar, handles reposicionando após rotação). Depois disso, marcar o que for aplicável em `implementation-plan.md` e só então commitar (mediante pedido explícito do usuário).

**Próximo passo natural após homologar e commitar esta refatoração**: FASE 5 (elementos provisórios: Jumper / Chave provisória) ou FASE 6 (simulação de manobra — modo GRAVANDO). Fases 5 e 6 podem ser feitas em qualquer ordem entre si, mas 6→7→8→9 é sequencial.

### Decisões e detalhes importantes que não estão óbvios só lendo o código

- **`@xyflow/react`**, não `reactflow` — pacote renomeado a partir do React Flow v12. `reactflow` hoje é só shim de compatibilidade.
- **Tailwind v4** via plugin do Vite (`@tailwindcss/vite`), não `tailwind.config.js`/postcss (modelo do v3).
- Model ORM usa colunas `topology_json`/`header_json`/`properties_json`, mas expõe `@property` (`topology`/`header`/`properties`) pro nome que a API/schema Pydantic usa (`from_attributes=True` mapeia direto).
- **react-router-dom** foi adotado (perguntado ao usuário na FASE 4) — rotas `/` e `/substations/:id`.
- **Identificação de usuário** (nome+email, sem auth real, persistido em localStorage via zustand `persist` + `IdentifyUserGate.tsx`) foi implementada na FASE 4 mesmo não estando em nenhum checklist explícito — necessária pro lock de edição funcionar.
- Handles do React Flow usam `type="source"` + `connectionMode={ConnectionMode.Loose}` (ligação elétrica não é direcional).
- Auto-save usa `PUT /substations/{id}` (não `PATCH` como o checklist da FASE 4 menciona — `api-contracts.md` só define PUT; divergência documentada no próprio `implementation-plan.md`).
- IDs de nó/aresta gerados com `crypto.randomUUID()` (não `Math.random()`/contador em memória — ver bug abaixo).
- Cores por tensão agora vivem em `frontend/src/constants/voltageColors.ts` — qualquer código novo que precise de cor por tensão deve importar dali, não redefinir.

### Bugs reais encontrados e corrigidos (relevante se algo parecido reaparecer)

1. **Race condition no lock de SE** (`lock_service.py`/`substations.py`): requisições concorrentes de lock/unlock podiam deixar `locked_by`/`locked_at` inconsistentes (SQLAlchemy só inclui no UPDATE colunas "dirty" na sessão). Corrigido com `.with_for_update()` nas queries usadas por `lock_substation`/`unlock_substation`/`update_substation`. Validado com stress test via curl paralelo.
2. **500 em vez de 404** quando `user_id` inexistente era passado em lock/PUT topologia (IntegrityError de FK não tratada). Corrigido com `_ensure_user_exists` antes de qualquer escrita que use `user_id` como FK.
3. **Frontend**: `editorStore.addEdge` usava contador em memória pra gerar ID de aresta (`e-${source}-${target}-${counter++}`), que reseta a cada reload — reconectar o mesmo par de nós após reload gerava ID duplicado (React key warning). Trocado por `crypto.randomUUID()` (mesma troca feita na geração de ID de nó em `SubstationEditorPage.tsx`).

## Ambiente / peculiaridades desta máquina

- Docker requer `sg docker -c "<comando>"` + `dangerouslyDisableSandbox: true` no Bash tool, porque o usuário `giuliano` foi adicionado ao grupo `docker` mas a sessão ainda não recarregou o grupo (`sudo usermod -aG docker` precisa de terminal interativo separado — não roda via Claude Code). `scripts/homologacao.sh` já encapsula esse workaround.
- Playwright (Chromium headless) foi usado para testes de UI, instalado localmente em scratchpad (não é dependência do projeto). `npx playwright install chromium` funciona; `--with-deps` falha por precisar de sudo interativo.

## Fluxo de trabalho combinado com o usuário

Implementar **uma fase/tarefa inteira** por vez → testar via Docker (subir containers, rodar testes, checar endpoints/UI) → marcar itens `[x]` no `implementation-plan.md` quando aplicável → resumir o que foi feito e **parar**. Só commitar quando o usuário pedir explicitamente ("pode commitar"), e só dar `git push` quando ele pedir isso separadamente (nunca proativamente). Nunca usar `git add -A` às cegas.

## Testes de concorrência

Fases futuras que mexam em lock/estado compartilhado devem repetir o padrão de teste com dois usuários simultâneos via Playwright (dois browser contexts) — foi o que revelou os 2 bugs de race condition acima.
