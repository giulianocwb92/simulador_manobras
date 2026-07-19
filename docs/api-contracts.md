# Contratos da API

Base URL: `/api/v1`

## Subestações

```
GET    /substations                     → lista todas as SEs
POST   /substations                     → cria nova SE
GET    /substations/{id}                → retorna SE com topologia atual
PUT    /substations/{id}                → atualiza topologia (requer lock)
GET    /substations/{id}/versions       → histórico de versões
GET    /substations/{id}/versions/{v}   → topologia de versão específica

POST   /substations/{id}/lock           → trava SE para edição (body: {user_id})
DELETE /substations/{id}/lock           → libera lock (body: {user_id})
```

### Schema Substation
```json
{
  "id": "uuid",
  "name": "SE Curitiba Batel",
  "sigla": "SE-CTB",
  "topology": { "nodes": [...], "edges": [...] },
  "version": 5,
  "locked_by": null,
  "locked_by_name": null,
  "locked_at": null,
  "created_at": "2025-01-15T10:00:00Z"
}
```

## Manobras

```
GET    /maneuvers                       → lista (filtros: se_id, user_id, status, data)
POST   /maneuvers                       → cria nova manobra (rascunho)
GET    /maneuvers/{id}                  → retorna manobra completa com passos
PUT    /maneuvers/{id}                  → atualiza cabeçalho ou status
DELETE /maneuvers/{id}                  → deleta rascunho

POST   /maneuvers/{id}/steps            → adiciona passo
PUT    /maneuvers/{id}/steps/{step_id}  → edita passo
DELETE /maneuvers/{id}/steps/{step_id}  → remove passo
POST   /maneuvers/{id}/steps/reorder    → reordena (body: {order: [ids]})

POST   /maneuvers/{id}/finalize         → finaliza manobra
POST   /maneuvers/{id}/clone            → clona como novo rascunho
GET    /maneuvers/{id}/pdf              → gera e retorna PDF
```

### Schema Maneuver
```json
{
  "id": "uuid",
  "title": "Desligamento TF-01 SE-CTB",
  "status": "RASCUNHO | FINALIZADA",
  "header": {
    "numero": "MAN-2025-001",
    "data": "2025-01-20",
    "responsavel": "Eng. João Silva",
    "area": "Divisão de Pré-Operação",
    "substations": ["SE Curitiba Batel", "SE Curitiba Norte"],
    "descricao_isolamento": "Isolamento do TF-01 para manutenção programada"
  },
  "steps": [
    {
      "id": "uuid",
      "order": 1,
      "description": "Abrir DJ 52-01 — verificar indicação de aberto no painel",
      "equipment_id": "dj-01",
      "action": "ABRIR",
      "origin": "SIMULADOR"
    },
    {
      "id": "uuid",
      "order": 2,
      "description": "Confirmar ausência de carga no alimentador",
      "equipment_id": null,
      "action": null,
      "origin": "MANUAL"
    }
  ],
  "created_by": "uuid-user",
  "created_at": "2025-01-15T10:00:00Z",
  "finalized_at": null
}
```

## Usuários

```
GET    /users                           → lista usuários
POST   /users                           → cria usuário (nome + email)
GET    /users/{id}                      → retorna usuário
```

## Códigos de resposta relevantes

| Código | Situação |
|--------|----------|
| 200    | OK |
| 201    | Criado |
| 404    | Não encontrado |
| 409    | Conflito (ex: sigla de SE duplicada) |
| 422    | Validação Pydantic |
| 423    | Locked — SE travada por outro usuário |
