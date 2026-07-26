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
- [x] FASE 2 — Backend: fundação (models, Alembic, schemas, lock de edição, routers `users`/`substations`)
- [x] FASE 3 — Frontend: estrutura base (React Query, Zustand, Tailwind, página inicial)
- [x] FASE 4 — Editor de topologia (React Flow, drag-and-drop, validação de conexão, lock visual, auto-save)
- [x] FASE 5 — Elementos provisórios (Jumper, Chave provisória — falta incorporar à topologia base ao finalizar a manobra, depende do botão "Finalizar Manobra" da FASE 7)
- [ ] FASE 6 — Simulação de manobra (gravação de passos com geração automática de texto e painel em tempo real prontos; falta suporte a uma 2ª subestação no mesmo canvas)
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

## Modos do editor

- **Configuração**: monta a topologia (arrastar componentes, conectar, editar propriedades, rotacionar)
- **"Iniciar Gravação"**: trava a topologia (nada se move ou é adicionado) e passa a registrar
  uma manobra — clicar num disjuntor, chave ou religador alterna o estado e gera
  automaticamente um passo com a descrição textual padrão, exibido em tempo real no painel
  lateral direito
- **"Finalizar Gravação"**: encerra o registro; o canvas fica somente leitura

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
