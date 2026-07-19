# Arquitetura Geral

## Visão de containers (Docker Compose)

```
┌─────────────────────────────────────────────┐
│               Rede local COPEL               │
│                                             │
│  Browser  ──→  :80  [frontend / Nginx]      │
│                       │                     │
│                       ↓ /api/v1/            │
│                :8000  [backend / FastAPI]    │
│                       │                     │
│                       ↓                     │
│                :5432  [postgres]             │
└─────────────────────────────────────────────┘
```

## Frontend

**React 18 + TypeScript + Vite**

- **React Flow**: engine do canvas (nós, arestas, drag-and-drop, zoom)
- **Zustand**: estado global (subestação ativa, modo do editor, passos da manobra)
- **React Query (TanStack Query)**: cache e sincronização com API
- **Tailwind CSS**: estilização

Módulos principais:
- `nodes/`: definição de cada tipo de nó (DJNode, CHNode, TFNode, BarraNode, LinhaNode, TPNode, TCNode, ReligadorNode)
- `components/editor/`: canvas principal, toolbar de componentes, painel de propriedades
- `components/maneuver/`: painel lateral com lista de passos, editor de passos, cabeçalho
- `stores/editorStore.ts`: modo atual (CONFIGURAÇÃO / GRAVANDO / FINALIZADA), estado dos equipamentos
- `stores/maneuverStore.ts`: passos gerados, metadados da manobra

## Backend

**FastAPI + SQLAlchemy 2.0 async + Alembic**

Routers (`app/api/`):
- `substations.py`: CRUD de subestações, lock/unlock, versioning
- `maneuvers.py`: CRUD de manobras, geração de PDF
- `users.py`: listagem de usuários (sem autenticação complexa v1)

Services (`app/services/`):
- `substation_service.py`: lógica de topologia, validação de conexões, versionamento
- `maneuver_service.py`: geração de texto dos passos, montagem do PDF
- `lock_service.py`: controle de lock com timeout

## Banco de dados

```sql
-- Subestações
substations (id, name, sigla, topology_json, version, locked_by, locked_at, created_at)
substation_versions (id, substation_id, topology_json, version, saved_at, saved_by)

-- Manobras
maneuvers (id, title, status, header_json, created_by, created_at, finalized_at)
maneuver_substations (maneuver_id, substation_id, substation_version)
maneuver_steps (id, maneuver_id, order, description, equipment_id, action, origin)

-- Usuários (simples, sem auth v1)
users (id, name, email, created_at)

-- Elementos provisórios
provisional_elements (id, maneuver_id, substation_id, type, properties_json, permanent)
```

## Serialização da topologia

A topologia é salva como JSON compatível com React Flow:

```json
{
  "nodes": [
    {
      "id": "dj-01",
      "type": "disjuntor",
      "position": { "x": 200, "y": 100 },
      "data": {
        "label": "DJ 52-01",
        "tensao": 138,
        "estado": "fechado"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "barra-01",
      "sourceHandle": "terminal-3",
      "target": "dj-01",
      "targetHandle": "terminal-a"
    }
  ]
}
```

## Geração de PDF

- **WeasyPrint**: renderiza HTML+CSS → PDF
- Template HTML em `backend/app/templates/maneuver.html`
- Logo e cabeçalho COPEL (a ser fornecido pelo usuário)
- Passos numerados com fonte monoespaçada para leitura clara
- PDF armazenado em `backend/storage/pdfs/` e servido via endpoint

## Autenticação (v1)

Sem autenticação formal na v1 — o usuário informa o nome ao entrar.
O nome é usado para: lock de edição, responsável na manobra, histórico.
Autenticação real (LDAP/AD COPEL) pode ser adicionada na v2.

## Variáveis de ambiente (.env)

```
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/simulador
STORAGE_PATH=/app/storage
FRONTEND_ORIGIN=http://localhost
```
