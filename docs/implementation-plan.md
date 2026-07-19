# Plano de Implementação

Ordem de desenvolvimento: infraestrutura → backend → editor → manobra → PDF → histórico.
Marque cada item com [x] ao concluir.

---

## FASE 1 — Infraestrutura

- [x] Criar `docker-compose.yml` com 3 serviços: postgres, backend, frontend
- [x] Criar `backend/Dockerfile` (Python 3.12 slim)
- [x] Criar `frontend/Dockerfile` (Node 20 + Nginx para prod)
- [x] Criar `.env.example` com todas as variáveis necessárias
- [x] Configurar rede interna Docker entre containers
- [x] Verificar que `docker compose up --build` sobe tudo sem erros

---

## FASE 2 — Backend: fundação

- [x] Scaffold FastAPI em `backend/app/main.py` com CORS configurado
- [x] Configurar SQLAlchemy async (`app/core/database.py`)
- [x] Criar models ORM: `User`, `Substation`, `SubstationVersion`, `Maneuver`, `ManeuverStep`, `ManeuverSubstation`, `ProvisionalElement`
- [x] Configurar Alembic e gerar migration inicial
- [x] Criar schemas Pydantic para todos os models
- [x] Implementar router `users` (CRUD simples)
- [x] Implementar router `substations` (CRUD + lock/unlock + versions)
- [x] Implementar `lock_service.py` com timeout de 30 minutos
- [x] Testes unitários: lock service, validações de schema
- [x] Verificar todos os endpoints via Swagger UI (`/docs`)

---

## FASE 3 — Frontend: estrutura base

- [x] Scaffold Vite + React 18 + TypeScript
- [x] Instalar dependências: `@xyflow/react` (React Flow v12, sucessor do pacote `reactflow`), `zustand`, `@tanstack/react-query`, `tailwindcss`
- [x] Configurar Tailwind
- [x] Criar `services/api.ts` (cliente HTTP com base URL configurável)
- [x] Criar `stores/editorStore.ts` (modo: CONFIGURAÇÃO / GRAVANDO / FINALIZADA)
- [x] Criar `stores/maneuverStore.ts` (passos, cabeçalho)
- [x] Criar página inicial: lista de subestações + botão criar nova

---

## FASE 4 — Editor de topologia

- [x] Instalar e configurar React Flow no canvas principal
- [x] Implementar `nodes/BarraNode.tsx` com handles dinâmicos e cor por tensão
- [x] Implementar `nodes/DJNode.tsx` com 2 handles e estado visual aberto/fechado
- [x] Implementar `nodes/CHNode.tsx` com 2 handles e estado visual aberto/fechado
- [x] Implementar `nodes/TFNode.tsx` com handles AT/BT e opcional terciário
- [x] Implementar `nodes/ReligadorNode.tsx`
- [x] Implementar `nodes/TPNode.tsx` e `nodes/TCNode.tsx`
- [x] Implementar `nodes/LinhaNode.tsx` com seleção de SE destino
- [x] Implementar toolbar de componentes (drag-and-drop para o canvas)
- [x] Implementar modal de propriedades ao soltar componente no canvas
- [x] Implementar validação `onConnect`: tensões incompatíveis, linha em MT
- [x] Implementar grid snap (20px)
- [x] Implementar auto-save a cada 30s (PUT na API — `docs/api-contracts.md` não define um PATCH de topologia, só `PUT /substations/{id}`; usado esse endpoint em vez do PATCH citado aqui)
- [x] Implementar lock visual: banner "SE travada por [nome]" quando `locked_by != null`
- [x] Implementar liberação de lock ao sair da página (`beforeunload` + cleanup do React Router ao navegar)

---

## FASE 5 — Elementos provisórios

- [ ] Implementar `nodes/JumperNode.tsx`
- [ ] Implementar `nodes/ChaveProvisorialNode.tsx`
- [ ] Modal ao adicionar: definir se é permanente ou temporário
- [ ] Lógica: ao finalizar manobra, elementos permanentes são incorporados à topologia base

---

## FASE 6 — Simulação de manobra

- [ ] Implementar troca de modo: botão "Iniciar Gravação" no editor
- [ ] No modo GRAVANDO: clique em DJ/CH/Religador → toggle estado + gera passo
- [ ] Geração automática do texto do passo (ver tabela em domain-model.md)
- [ ] Painel lateral direito: lista de passos em tempo real
- [ ] Suporte a múltiplas SEs: carregar 2ª SE no mesmo canvas (separadas visualmente)
- [ ] Passos de SEs diferentes identificados por prefixo da SE no texto

---

## FASE 7 — Edição da manobra

- [ ] Painel de edição de passos: reordenar (drag-and-drop), deletar, editar texto
- [ ] Botão "Adicionar passo manual" → campo de texto livre inserido na posição desejada
- [ ] Formulário de cabeçalho: número, data, responsável, área, descrição do isolamento
- [ ] Botão "Finalizar Manobra" → status FINALIZADA, canvas fica readonly

---

## FASE 8 — Geração de PDF

- [ ] Criar template HTML em `backend/app/templates/maneuver.html`
  - Aguardar template COPEL fornecido pelo usuário
  - Placeholder: cabeçalho genérico com campos definidos
- [ ] Implementar `maneuver_service.py`: monta contexto do template
- [ ] Integrar WeasyPrint para renderizar HTML → PDF
- [ ] Endpoint `GET /maneuvers/{id}/pdf` salva em `storage/pdfs/` e retorna arquivo
- [ ] Botão "Baixar PDF" no frontend

---

## FASE 9 — Histórico

- [ ] Página de histórico: lista de manobras finalizadas
- [ ] Filtros: subestação, data (range), responsável
- [ ] Card de manobra: título, SEs, responsável, data, status
- [ ] Ações: visualizar (readonly), baixar PDF, clonar
- [ ] Clonar: cria novo rascunho com mesmos passos, abre para edição

---

## FASE 10 — Polimento e entrega

- [ ] Tratamento de erros global no frontend (toast de erro para falhas de API)
- [ ] Loading states em todas as operações assíncronas
- [ ] Responsividade básica (funciona em 1280px+)
- [ ] README com instruções de instalação e uso
- [ ] Variáveis de ambiente documentadas em `.env.example`
- [ ] Testar fluxo completo: criar SE → montar topologia → gravar manobra → gerar PDF

---

## Dependências entre fases

```
FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 6 → FASE 7 → FASE 8 → FASE 9
                                   → FASE 5 ↗
```

Fases 4 e 5 podem ser desenvolvidas em paralelo após FASE 3.
FASE 8 depende do template PDF da COPEL — pode ser feita com placeholder enquanto aguarda.
