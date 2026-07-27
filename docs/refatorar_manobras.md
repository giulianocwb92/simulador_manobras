# Refatoração: Sessão de Manobra + Edição + Preview PDF + Bugfixes

## Contexto

Aplicação de simulação de manobras elétricas da COPEL (FastAPI + SQLAlchemy 2.0 async +
Alembic no backend; React 18 + Vite + `@xyflow/react` + Zustand + React Query no frontend).
Fases 1–9 completas. Ver `CLAUDE.md`, `docs/architecture.md`, `docs/domain-model.md` e
`docs/editor-topology.md` para estrutura e convenções.

Este documento agrupa várias frentes que podem ser implementadas na ordem apresentada.
Cada frente é independente o suficiente para revisão faseada. Não commitar — apenas
implementar e reportar ao final de cada frente.

---

## FRENTE 0 — Tela inicial (home) e reorganização da navegação

### Objetivo
Criar uma tela inicial clara que separa visualmente os dois mundos do sistema e dá acesso
ao histórico. Hoje a navegação mistura configuração de topologia com gravação de manobra,
o que confunde o fluxo. A home passa a ser o ponto de entrada.

### Estrutura
Rota raiz `/` → `HomePage`, com um grid de **três cards** (layout flexível, preparado para
crescer para 4+ no futuro sem refazer):

1. **Configuração de Subestações**
   - Descrição: cadastrar e editar a topologia permanente das SEs.
   - Navega para a lista de SEs cadastradas (`/substations` ou equivalente já existente),
     de onde se cria nova SE, edita existente e abre o canvas de topologia.
   - Este é o único fluxo onde a topologia é **persistida** no banco.

2. **Manobras**
   - Descrição: criar e gravar manobras, editar e gerar PDF.
   - Navega para a lista de manobras (`/manobras`), de onde se abre
     **"Nova Sessão de Manobra"** (ver FRENTE 2 — canvas efêmero, SEs read-only) e se
     acessa manobras existentes para edição.

3. **Histórico**
   - Descrição: consultar manobras anteriores, filtrar e clonar.
   - Navega para a página de histórico já existente (com filtros/clone).

### Implementação
- Criar `HomePage` como nova rota `/`. Se a `/` hoje aponta para outra coisa, mover esse
  conteúdo para uma rota nomeada apropriada e deixar a home como entrada.
- Grid responsivo (Tailwind v4) que comporta 2, 3 ou 4 cards sem quebrar o layout — usar
  grid com colunas que se ajustam, não largura fixa por card.
- Cada card: título, breve descrição, ícone opcional, e é clicável por inteiro.
- Manter um cabeçalho/título do app na home ("Simulador de Manobras" ou equivalente já usado).
- Revisar `react-router` para que os links de navegação (voltar à home) existam nas telas
  internas.

### Observação
Gestão de usuários e login/senha serão discutidos em seguida — **não** implementar nesta
frente. Apenas deixar o grid preparado para receber um quarto card no futuro.

### Aceite
- Ao abrir o app, o usuário vê três caminhos claros e distintos.
- "Configuração de Subestações" leva ao mundo de cadastro/topologia persistida.
- "Manobras" leva ao mundo de gravação/edição (canvas efêmero).
- "Histórico" leva à consulta de manobras anteriores.

---

## FRENTE 1 — Bugfix: propagação de cor por barra e transformador

### Problema
1. Uma barra de tensão menor (ex.: 13,8 kV) está sendo tratada como fonte e colorindo a
   topologia **sem ter o raio (`fonte: true`) marcado**. A propagação de cor só pode iniciar
   em nós com `fonte: true` explicitamente marcado.
2. A cor está propagando de volta pelo transformador (baixa → alta), o que não deveria
   acontecer por padrão.

### Correção
- No BFS de propagação de cor (procurar em `frontend/src/utils/` — provável arquivo de
  propagação/coloração): garantir que o conjunto inicial de nós do BFS contenha **somente**
  nós com `fonte === true`. Nenhuma barra deve ser semente do BFS por padrão.
- Transformador (`TF`, `TF3`): a travessia através do transformador deve ser **unidirecional
  (AT → BT)** por padrão. A cor não pode fluir de BT para AT.
- Adicionar ao nó de transformador uma opção de configuração:
  - Checkbox **"Permitir propagação reversa (BT → AT)"**
  - Default: **desmarcado**
  - Persistir esse flag no `data` do nó (ex.: `data.propagacaoReversa: boolean`)
  - Quando marcado: a travessia através daquele transformador passa a ser bidirecional
- Revisar a lógica do BFS para respeitar esse flag por transformador (não globalmente).

### Aceite
- Inserir barra de baixa tensão sem raio → não colore nada.
- Barra AT com raio marcado energizando transformador → colore só até a BT, não volta.
- Marcar "propagação reversa" em um transformador específico → cor flui nos dois sentidos
  apenas naquele transformador.

---

## FRENTE 2 — Modo Sessão de Manobra (canvas efêmero, SEs read-only)

### Objetivo
Separar dois mundos hoje misturados:
- **Cadastro de SE** (persistido no banco, editável no seu próprio canvas)
- **Sessão de gravação de manobra** (efêmera, nunca salva topologia de volta)

Hoje o auto-save faz `PUT /substations/:id` durante a gravação, o que faz a segunda SE
(sem ID persistido) sumir. A solução é remover completamente a persistência de topologia
do fluxo de gravação.

### Modelo (Opção C — canvas de gravação sempre efêmero)
- Ao iniciar uma sessão de manobra, o usuário seleciona **uma ou mais SEs** do banco.
- Essas SEs são **importadas read-only** para o canvas (camada base).
- O canvas da sessão vive **apenas no Zustand** durante a sessão. Não há auto-save de
  topologia. O `PUT /substations/:id` NÃO é chamado neste fluxo.
- O "estado inicial" da sessão é sempre o banco — reimportar do banco reinicia a sessão.

### Camadas do canvas de sessão
1. **Camada base (read-only):** nós e arestas importados das SEs selecionadas. O usuário
   não edita nem persiste essa camada.
2. **Camada de sessão (editável, efêmera):**
   - Elementos provisórios: **Jumper** e **Chave Provisória** podem ser adicionados
     livremente (eles já existem como tipos de nó e por definição não são salvos).
   - Conexões (wires) entre SEs distintas dentro da sessão.
   - Ajustes de posição para compor o layout da sessão.
   - Tudo isso existe só em memória durante a sessão.

### Fluxo
```
Tela inicial → "Nova Sessão de Manobra"
    → seleciona SEs participantes (multi-seleção, sem limite)
    → canvas de sessão (base read-only + elementos provisórios editáveis)
    → modo GRAVANDO (clica equipamentos, gera passos)
    → finaliza → gera manobra com os passos
    → tela de edição da manobra
```

### Implementação
- Nova entrada de fluxo/rota para "Nova Sessão de Manobra" (ex.: `/manobras/nova` ou
  um seletor antes do canvas). Definir junto do padrão de rotas já existente em react-router.
- Store Zustand da sessão: guarda SEs importadas, elementos provisórios, wires de sessão e
  o estado de gravação. Sem persistência de topologia.
- Ao importar SEs: buscar via `GET /substations/:id` para cada SE selecionada e montar o
  canvas combinado. Marcar os nós importados como não-editáveis/não-persistíveis.
- Remover qualquer chamada de auto-save de topologia dentro do fluxo de gravação.
- A finalização da manobra (`POST /maneuvers/{id}/finalize` ou fluxo equivalente) continua
  persistindo a **manobra e seus passos** normalmente — o que não persiste é a topologia
  da sessão.

### Observação
Se o operador precisar ajustar a topologia permanente de uma SE, ele faz isso no cadastro
da SE (fluxo separado), depois inicia nova sessão. Isso é intencional.

---

## FRENTE 3 — Backend: numeração, responsabilidade e remoção de MANUAL

### 3a. Numeração sequencial da manobra
- Nova coluna `maneuvers.number` — `String`, nullable.
- Formato: `"0001/2026"` (4 dígitos zero-padded + ano corrente).
- Atribuído **no primeiro salvamento real** da manobra (quando `number` ainda é `null`).
  Nunca reatribuído depois.
- Geração: buscar o maior sequencial do ano corrente
  (`SELECT ... WHERE number LIKE '%/{ano}'`), incrementar, formatar. Cuidar de concorrência
  o suficiente para o contexto (rede local, baixo volume).
- Sequencial reinicia a cada ano civil.
- Criar migration Alembic.

### 3b. Responsabilidade por passo (LOCAL / CENTRO)
- Nova coluna `maneuver_steps.responsibility` — `Enum('LOCAL', 'CENTRO')`, `NOT NULL`,
  default `'CENTRO'`.
- Passos gerados pela simulação nascem com `CENTRO`.
- Criar migration Alembic.

### 3c. Remover ação MANUAL
- No enum de ação do passo (`ManeuverStep.action`): remover o valor `MANUAL`.
- Passos válidos: `ABRIR`, `FECHAR`, ou `null`.
  - `null` = passo inserido manualmente (texto livre, sem badge).
- Criar migration Alembic para alterar/recriar o tipo enum. Migrar dados existentes:
  passos que hoje são `MANUAL` devem virar `null`.

### 3d. Schemas
- `ManeuverStepRead`, `ManeuverStepCreate`, `ManeuverStepUpdate`: incluir
  `responsibility: Literal['LOCAL', 'CENTRO']` e permitir `action: Literal['ABRIR','FECHAR'] | None`.
- `ManeuverRead`: incluir `number: str | None`.
- Atualizar os 20 testes de schema afetados.

---

## FRENTE 4 — Frontend: painel read-only, tela de edição e preview PDF

### 4a. Painel lateral — somente leitura + simplificado
Arquivos: componentes em `frontend/src/components/maneuver/`.
- Remover todos os campos de edição inline do painel.
- Manter apenas:
  - Lista de passos em ordem temporal (numerados, badge FECHAR/ABRIR quando `action` não é
    null, indicador LOCAL/CENTRO).
  - Botão "Excluir" por passo (com confirmação) — permite verificar posição e ordem temporal.
  - Botão **"Editar Manobra"** → navega para `/manobras/:id/editar`.
  - Botão **"Visualizar PDF"** → abre `/manobras/:id/pdf` em nova aba.

### 4b. Nova rota `/manobras/:id/editar` — `ManeuverEditPage`
Página dedicada, sem o canvas de topologia ao lado.

**Cabeçalho:**
- Número: **somente leitura** (exibe `number` do backend, ou "—" se ainda null).
- Data: input date, editável.
- Responsável: input text, editável.
- Área: input text, editável.
- Subestações: somente leitura (derivado de `header.substations`, que já vem da relação
  `ManeuverSubstation` real).

**Descrição do Isolamento:** textarea livre, editável.

**Lista de passos (drag & drop):**
- Usar `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`. Verificar se estão no
  `package.json`; se não, instalar.
- Cada passo exibe:
  - Handle de drag (ícone de arrasto).
  - Número recalculado automaticamente ao reordenar/inserir/excluir (não editável).
  - Badge **FECHAR** (verde) ou **ABRIR** (vermelho) quando `action` não é null;
    **nenhum badge** quando `action` é null.
  - Campo de texto editável inline (o texto pode ser alterado mesmo nos passos com badge
    travado — só o badge é travado, o texto não).
  - Dropdown de responsabilidade: **LOCAL | CENTRO** (default CENTRO).
  - Botão excluir passo.
- Botão **"＋ Inserir passo"** entre cada item existente e ao final:
  - Cria passo com `action: null`, `responsibility: 'CENTRO'`, texto vazio.
  - Sem seleção de badge (passos manuais nunca têm badge).

**Rodapé fixo:**
- "Salvar" → `PUT /maneuvers/{id}` com todos os campos; atribui `number` se ainda null.
- "Visualizar PDF" → **salva primeiro**, depois abre `/manobras/:id/pdf` em nova aba.
- "Voltar" → confirma se há alterações não salvas, navega para `/manobras/:id`.

**Auto-save:** debounce de ~2s em qualquer alteração de campo.

### 4c. Voltar à gravação (reiniciar / sobrepor)
Na tela de edição (ou no painel), botão **"Voltar à Gravação"** → modal com opções:
- **Reiniciar topologia:** limpa o canvas e reimporta as SEs do banco do zero (estado
  inicial = banco). Limpa também os passos.
- **Nova gravação (sobrepor):** mantém o canvas efêmero atual, limpa apenas os passos e
  inicia nova gravação. Ao finalizar, **sobrescreve a manobra existente**, gerando uma
  versão anterior via o versionamento já existente.
- **Cancelar.**

### 4d. Preview PDF inline (sem download automático)
- Endpoint `GET /maneuvers/{id}/pdf`: **remover** `Content-Disposition: attachment`.
  Retornar `Content-Type: application/pdf` puro para o browser renderizar inline.
- Frontend: abrir `/manobras/:id/pdf` em nova aba (ou modal fullscreen com `<iframe>`).
  O browser exibe o PDF com controles nativos (zoom, imprimir, baixar) — o usuário decide
  se baixa ou não.
- Não duplicar o layout do template no frontend.

---

## FRENTE 5 — Ajustes no template do PDF

Arquivo: `backend/app/templates/maneuver.html` (template provisório — manter genérico,
`build_pdf_context` não deve precisar mudar).

- Exibir o **Número** da manobra no cabeçalho (hoje aparece "—").
- Tabela de passos: adicionar **coluna "Responsabilidade"** exibindo LOCAL/CENTRO por passo.
- **Corrigir espaçamento das colunas:** a coluna do responsável/ação e a coluna de descrição
  estão muito próximas. Definir larguras de coluna explícitas e padding adequado para dar
  respiro visual entre a responsabilidade, o badge de ação e o texto do passo.
- Remover qualquer badge/estilo remanescente de MANUAL.
- Passos com `action: null` renderizam sem badge.

---

## Ordem de implementação sugerida
1. FRENTE 1 (bugfix propagação) — isolado, valida rápido.
2. FRENTE 0 (home + navegação) — reorganiza as rotas que as demais frentes usam.
3. FRENTE 3 (migrations + schemas backend).
4. FRENTE 5 (template PDF) + endpoint PDF sem attachment (item 4d do backend).
5. FRENTE 2 (modo sessão de manobra).
6. FRENTE 4 (painel read-only + tela de edição + preview + voltar à gravação).

## Restrições e padrões
- `@xyflow/react` (não `reactflow`).
- Tailwind v4 via plugin Vite, sem `tailwind.config.js`.
- Zustand para estado global, React Query para server state.
- Grid snap 6px, wires ortogonais (`type: "step"`).
- `BarraNode` é único componente parametrizado por `tipo`.
- Docker (se necessário): prefixo `sg docker -c` e `dangerouslyDisableSandbox`.
- **Nunca commitar** — apenas implementar e reportar ao final de cada frente.
