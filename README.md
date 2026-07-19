# Simulador de Manobras — COPEL Distribuição

Sistema web para planejamento e documentação de manobras em subestações de distribuição,
desenvolvido para engenheiros de pré-operação da COPEL Distribuição.

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

## Como rodar

```bash
docker compose up --build         # sobe frontend, backend e postgres
docker compose up backend         # só backend (porta 8000)
docker compose up frontend        # só frontend (porta 5173)
```

Backend (fora do container, com venv):

```bash
cd backend
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

## Estrutura de pastas

```
/
├── docker-compose.yml
├── docs/                # documentação de referência (arquitetura, domínio, API, editor, plano)
├── backend/
│   └── app/{api,models,schemas,services,core}/
└── frontend/
    └── src/{components,nodes,stores,hooks,services,types}/
```

## Documentação

- [Arquitetura geral](docs/architecture.md)
- [Modelo de domínio e regras de negócio](docs/domain-model.md)
- [Editor de topologia (React Flow)](docs/editor-topology.md)
- [Contratos da API](docs/api-contracts.md)
- [Plano de implementação](docs/implementation-plan.md)
