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
- [x] Implementar grid snap (6px — 10px não divide os 12px de offset do terminal vertical dos componentes de 24px, causando cotovelos residuais nos wires; ver `utils/barraLayout.ts`)
- [x] Implementar auto-save a cada 30s (PUT na API — `docs/api-contracts.md` não define um PATCH de topologia, só `PUT /substations/{id}`; usado esse endpoint em vez do PATCH citado aqui)
- [x] Implementar lock visual: banner "SE travada por [nome]" quando `locked_by != null`
- [x] Implementar liberação de lock ao sair da página (`beforeunload` + cleanup do React Router ao navegar)

---

## FASE 5 — Elementos provisórios

- [x] Implementar `nodes/JumperNode.tsx`
- [x] Implementar `nodes/ChaveProvisoriaNode.tsx` (nome corrigido de `ChaveProvisorialNode.tsx`)
- [x] Modal ao adicionar: definir se é permanente ou temporário
- [ ] Lógica: ao finalizar manobra, elementos permanentes são incorporados à topologia base
      — o botão "Finalizar Manobra" já existe (FASE 7), mas só chama `POST
      /maneuvers/{id}/finalize`; ainda falta, nesse handler, filtrar os nós com
      `permanente: true` e persistir na(s) SE(s) envolvidas via `PUT /substations/{id}`

---

## FASE 6 — Simulação de manobra

- [x] Implementar troca de modo: botão "Iniciar Gravação" no editor (e "Finalizar Gravação",
      complementar — sem isso não dava pra sair do modo GRAVANDO nem testar a fase)
- [x] No modo GRAVANDO: clique em DJ/CH/Religador → toggle estado + gera passo
- [x] Geração automática do texto do passo (ver tabela em domain-model.md)
- [x] Painel lateral direito: lista de passos em tempo real
- [x] Suporte a múltiplas SEs: carregar 2ª SE no mesmo canvas (separadas visualmente —
      offset horizontal calculado a partir do maior X já ocupado; SE secundária é só
      leitura/toggle, não é dona do lock nem é salva pelo PUT desta tela)
- [x] Passos de SEs diferentes identificados por prefixo da SE no texto (`[SIGLA] ...`,
      só aparece quando há 2 SEs carregadas — numa manobra de SE única o prefixo é omitido)

---

## FASE 7 — Edição da manobra

- [x] Router `maneuvers` no backend (`app/api/maneuvers.py` + `maneuver_service.py`) — a
      FASE 2 tinha criado só os models/schemas de Maneuver, mas nunca o router; sem ele
      não havia onde persistir nada desta fase, então foi implementado agora (create,
      get, update header/status, steps CRUD + reorder, finalize — clone/pdf ficam pras
      FASES 8/9)
- [x] Painel de edição de passos: reordenar (drag-and-drop), deletar, editar texto —
      cada ação sincroniza com a API na hora (mesmo espírito do auto-save da topologia)
- [x] Botão "Adicionar passo manual" → campo de texto livre inserido no fim da lista
      (posicionar em outro lugar é reordenar por drag-and-drop depois de adicionar)
- [x] Formulário de cabeçalho: número, data, responsável, área, descrição do isolamento
      (salva por campo, no blur)
- [x] Botão "Finalizar Manobra" → `POST /maneuvers/{id}/finalize`, status FINALIZADA;
      canvas já fica readonly desde a FASE 6 (botão "Finalizar Gravação" muda
      `editorStore.mode`, um estado local do canvas — diferente do status da manobra no
      backend, que é o que esse botão novo controla)

---

## FASE 8 — Geração de PDF

- [x] Criar template HTML em `backend/app/templates/maneuver.html`
  - Aguardando o template oficial — este é o modelo PROVISÓRIO: logo (embutido como
    data URI a partir de `backend/app/static/copel-logo.png`), tabela de cabeçalho
    (número/data/responsável/área/subestações), descrição do isolamento, passos
    numerados em fonte monoespaçada com badge ABRIR/FECHAR/MANUAL, rodapé com
    paginação — trocar pelo template oficial quando ele chegar, o contexto
    (`build_pdf_context`) não deve precisar mudar
- [x] Implementar `maneuver_service.py`: `build_pdf_context`/`render_pdf`/`save_pdf`
      montam o contexto, renderizam via Jinja2 e salvam o PDF
- [x] Integrar WeasyPrint para renderizar HTML → PDF (`jinja2` adicionado ao
      requirements.txt — só o WeasyPrint já estava lá desde a FASE 1, mas faltava o
      motor de template)
- [x] Endpoint `GET /maneuvers/{id}/pdf` salva em `storage/pdfs/{id}.pdf` (regenerado a
      cada chamada, pra refletir edições até a manobra ser finalizada) e retorna o
      arquivo com `Content-Disposition: attachment`
- [x] Botão "Baixar PDF" no frontend (link direto pro endpoint, visível junto com o
      painel de edição da manobra)

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
