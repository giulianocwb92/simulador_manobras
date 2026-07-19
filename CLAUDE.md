# Simulador de Manobras — COPEL Distribuição

Sistema web para planejamento e documentação de manobras em subestações de distribuição.
Desenvolvido para engenheiros de pré-operação da COPEL Distribuição.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + React Flow + Zustand
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2.0 (async)
- **Banco**: PostgreSQL 16
- **PDF**: WeasyPrint
- **Infra**: Docker Compose (3 containers: frontend, backend, postgres)

## Comandos

```bash
# Desenvolvimento
docker compose up --build         # sobe tudo
docker compose up backend         # só backend (porta 8000)
docker compose up frontend        # só frontend (porta 5173)

# Backend (dentro do container ou venv)
cd backend
uvicorn app.main:app --reload
alembic upgrade head              # aplica migrations
alembic revision --autogenerate -m "descrição"  # nova migration
pytest                            # roda testes

# Frontend
cd frontend
npm install
npm run dev
npm run build
npm run typecheck
```

## Estrutura de pastas

```
/
├── CLAUDE.md
├── docker-compose.yml
├── docs/                         # referências detalhadas (@docs/)
│   ├── architecture.md
│   ├── domain-model.md
│   ├── editor-topology.md
│   ├── api-contracts.md
│   └── implementation-plan.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/                  # routers FastAPI
│   │   ├── models/               # SQLAlchemy ORM
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # lógica de negócio
│   │   └── core/                 # config, db, deps
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── editor/           # canvas React Flow
    │   │   ├── maneuver/         # painel de manobra
    │   │   └── ui/               # componentes genéricos
    │   ├── nodes/                # tipos de nós React Flow (DJ, CH, TF...)
    │   ├── stores/               # Zustand stores
    │   ├── hooks/
    │   ├── services/             # chamadas à API
    │   └── types/
    └── package.json
```

## Convenções

- Código e comentários em **português**
- API REST: `/api/v1/...`
- Schemas Pydantic separados de ORM models
- Um router por domínio (substations, maneuvers, users)
- Testes em `backend/tests/` espelhando estrutura de `app/`
- Variáveis de ambiente via `.env` (nunca hardcoded)

## Referências detalhadas

- Domínio elétrico e regras de negócio → @docs/domain-model.md
- Editor de topologia (React Flow) → @docs/editor-topology.md
- Contratos da API → @docs/api-contracts.md
- Plano de implementação passo a passo → @docs/implementation-plan.md
- Arquitetura geral → @docs/architecture.md
