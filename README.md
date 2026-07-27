# Simulador de Manobras

Sistema web para planejamento e documentação de manobras em subestações de distribuição,
desenvolvido para engenheiros de pré-operação.

Permite montar a topologia de uma subestação em um editor visual, simular a sequência de
manobras (abertura/fechamento de disjuntores, chaves e religadores), gerar automaticamente
a descrição textual de cada passo e exportar o resultado final em PDF.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + React Flow + Zustand
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2.0 (async)
- **Banco**: PostgreSQL 16
- **PDF**: WeasyPrint
- **Infra**: Docker Compose (frontend, backend, postgres)

## Status

🚧 Em desenvolvimento — ver checklist de fases em [`docs/implementation-plan.md`](docs/implementation-plan.md).

- [x] FASE 1 — Infraestrutura (Docker Compose, Dockerfiles)
- [x] FASE 2 — Backend: fundação (models, Alembic, schemas, lock de edição, routers `users`/`substations`/`maneuvers`)
- [x] FASE 3 — Frontend: estrutura base (React Query, Zustand, Tailwind, página inicial)
- [x] FASE 4 — Editor de topologia (React Flow, drag-and-drop, validação de conexão, lock visual, auto-save)
- [x] FASE 5 — Elementos provisórios (Jumper, Chave provisória — falta incorporar à topologia base ao finalizar a manobra)
- [x] FASE 6 — Simulação de manobra (gravação de passos com geração automática de texto, painel em tempo real, suporte a uma 2ª subestação no mesmo canvas)
- [x] FASE 7 — Edição da manobra (cabeçalho, editar/reordenar/deletar passos, passo manual, finalizar — tudo persistido via API)
- [x] FASE 8 — Geração de PDF (template **provisório** — aguardando o modelo oficial; botão "Baixar PDF")
- [x] FASE 9 — Histórico (`/manobras`: listar manobras finalizadas com filtros, visualizar, baixar PDF, clonar)
- [ ] demais fases em [`docs/implementation-plan.md`](docs/implementation-plan.md)

## Como rodar

Antes da primeira execução, copie o `.env.example` para `.env`:

```bash
cp .env.example .env
```

```bash
docker compose up --build         # sobe frontend, backend e postgres
docker compose up backend         # só backend (porta 8000)
docker compose up frontend        # só frontend (porta 5173)
```

Com o backend no ar:
- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/health

Com o frontend no ar, abra http://localhost:5173 — na primeira vez ele pede nome e email
(sem autenticação real, é só pra identificar quem trava/edita uma subestação). Depois é
possível criar uma subestação na tela inicial e abrir o editor de topologia clicando nela.

Ao subir pela primeira vez (ou após uma nova migration), aplique o schema do banco:

```bash
docker compose exec backend alembic upgrade head
```

Backend (fora do container, com venv):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
alembic upgrade head              # aplica migrations
pytest                            # roda testes
```

Frontend (fora do container):

```bash
cd frontend
npm install
npm run dev
npm run build
npm run typecheck
```

## Atalhos do editor

- **Duplo-clique** num equipamento: abre o modal de propriedades para edição (clique simples só seleciona/move, sem abrir o modal)
- **W**: ativa a ferramenta Wire (clique para iniciar o fio, clique novamente para concluir); **Esc** ou **Delete** cancela
- **Ctrl+R**: rotaciona os componentes selecionados (0°/90°/180°/270°)
- **Duplo-clique** num fio: remove a conexão
- Grid snap de 6px em todo o canvas (6 divide o offset de 12px do terminal dos componentes, evitando cotovelos residuais nos wires)
- Numa SE vazia, a câmera não reenquadra sozinha ao soltar o primeiro componente — o `fitView` do React Flow só é ativado quando a SE já chega com nós salvos (ver `Canvas.tsx`)

## Modos do editor

- **Configuração**: monta a topologia (arrastar componentes, conectar, editar propriedades, rotacionar)
- **"Iniciar Gravação"**: trava a topologia (nada se move ou é adicionado) e passa a registrar
  uma manobra — clicar num disjuntor, chave ou religador alterna o estado e gera
  automaticamente um passo com a descrição textual padrão, exibido em tempo real no painel
  lateral direito
- **"Finalizar Gravação"**: encerra o registro; o canvas fica somente leitura e o painel
  lateral passa a mostrar a lista de passos **somente leitura** (com badge de ação
  ABRIR/FECHAR quando houver, badge de responsabilidade LOCAL/CENTRO, e botão excluir por
  passo) — toda edição de fato (texto, reordenar, cabeçalho, inserir passo manual) é feita
  na tela dedicada **"Editar Manobra"** (`/manobras/{id}/editar`), acessível por um botão
  no próprio painel
- **"Finalizar Manobra"**: chama `POST /maneuvers/{id}/finalize` — a manobra fica
  permanentemente travada para edição (diferente do "Finalizar Gravação" acima, que só
  trava o canvas; este trava o registro da manobra em si)
- Uma 2ª subestação pode ser carregada no mesmo canvas (seletor no cabeçalho), lado a
  lado com a principal — útil pra manobras que envolvem duas SEs; os passos gerados a
  partir dela vêm prefixados com a sigla correspondente
- **"Visualizar PDF"**: abre o PDF da manobra numa aba nova, renderizado inline (o backend
  devolve `Content-Disposition: inline`, sem forçar download) a partir do template em
  `backend/app/templates/maneuver.html` — **modelo provisório**, com layout genérico
  (logo + tabela de cabeçalho + passos numerados com responsabilidade), aguardando o
  template oficial

## Edição da manobra (`/manobras/{id}/editar`)

Tela dedicada pra editar uma manobra em rascunho (chegando pelo painel do editor ou pelo
botão "Editar" na tela de histórico/detalhe):

- **Cabeçalho**: número (somente leitura — ver abaixo), data, responsável, área (editáveis)
  e subestações (somente leitura, derivada das SEs vinculadas), mais a descrição do
  isolamento
- **Passos**: lista arrastável (`@dnd-kit`) — reordenar arrasta pelo ícone ⠿ e persiste na
  hora; cada passo tem texto editável, dropdown de responsabilidade (LOCAL/CENTRO) e botão
  excluir; botão "＋ Inserir passo" entre quaisquer dois passos (ou no topo/fim) cria um
  passo em branco na posição exata
- **Auto-save**: debounce de 2s em qualquer alteração de campo (cabeçalho ou texto/
  responsabilidade de passo); botão "Salvar" força o envio imediato
- **Número da manobra**: formato `0001/2026` (sequencial zero-padded + ano corrente),
  atribuído automaticamente pelo backend no primeiro salvamento com dados reais e nunca
  reatribuído depois — por isso é sempre somente leitura no formulário
- **"Visualizar PDF"**: salva primeiro, depois abre o PDF numa aba nova

## Histórico de manobras

Em `/manobras` (link na tela inicial): lista as manobras finalizadas, com filtros por
subestação, responsável e intervalo de datas. Cada card leva pra tela de detalhe
(`/manobras/{id}`), que tem três ações — **Editar** (só pra rascunhos, leva pra
`/manobras/{id}/editar`), **Visualizar PDF** e **Clonar** (cria um novo rascunho com o
mesmo cabeçalho e sequência de passos, religado à versão atual de cada SE envolvida — o
clone recebe um número próprio, não herda o da manobra original).

## Estrutura de pastas

```
/
├── docker-compose.yml
├── docs/                # documentação de referência (arquitetura, domínio, API, editor, plano)
├── backend/
│   ├── app/{api,models,schemas,services,core}/
│   ├── alembic/         # migrations
│   └── tests/
└── frontend/
    └── src/{components,nodes,stores,hooks,services,types}/
```

## Documentação

- [Arquitetura geral](docs/architecture.md)
- [Modelo de domínio e regras de negócio](docs/domain-model.md)
- [Editor de topologia (React Flow)](docs/editor-topology.md)
- [Contratos da API](docs/api-contracts.md)
- [Plano de implementação](docs/implementation-plan.md)
