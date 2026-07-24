# Correções pós-homologação — Editor de Topologia

Leia @docs/editor-topology.md e @docs/domain-model.md antes de começar.
São 4 correções independentes. Implemente na ordem abaixo.

---

## CORREÇÃO 1 — Barra unificada

Unificar `BarraPrincipalNode`, `BarraTransferenciaNode` e `BarraDuplaNode`
em um único componente `BarraNode`.

### Propriedades em `data`

```typescript
tipo:   'principal' | 'transferencia' | 'dupla'
fonte:  boolean   // true = barra que inicia propagação de cor
tensao: number    // nível de tensão em kV
nome:   string    // nome livre definido pelo usuário
```

### Visual por tipo

| tipo          | stroke-width | cor padrão                  |
|---------------|--------------|-----------------------------|
| principal     | 6px          | VOLTAGE_COLORS[tensao]      |
| transferencia | 2px          | cinza (#94a3b8)             |
| dupla         | 6px          | VOLTAGE_COLORS[tensao]      |

- Barra de transferência assume VOLTAGE_COLORS[tensao] ao receber
  propagação de cor (ver Correção 3); cinza quando sem caminho fechado
- Barra dupla: o usuário define qual das duas tem `fonte: true`
  e pode alterar isso durante a manobra

### Flag `fonte`

- Pode haver mais de uma barra fonte na mesma SE
  (ex: SE com barras de 230 kV e 138 kV separadas)
- Indicação visual: ícone ⚡ pequeno acima da barra quando `fonte: true`
- Editável no painel de propriedades do nó

### Arquivos

- Remover: `BarraPrincipalNode.tsx`, `BarraTransferenciaNode.tsx`, `BarraDuplaNode.tsx`
- Criar: `BarraNode.tsx`
- Atualizar: `nodes/index.ts`, `nodeTypes` no canvas, `PropertiesModal.tsx`, `Toolbar.tsx`

`Toolbar.tsx`: substituir os três itens de barra por um único item "Barra"
que abre o `PropertiesModal` ao ser solto no canvas, com campos:
tipo (select), fonte (checkbox), tensão (select), nome (texto livre).

---

## CORREÇÃO 2 — Wire: corrigir pontos de conexão no SVG

O wire está conectando em pontos errados dos símbolos SVG.

Para cada nó, o handle deve estar posicionado exatamente onde o wire
toca o símbolo visualmente. Usar `style` com `top`/`left` em px ou %:

```tsx
<Handle
  type="source"
  position={Position.Left}
  id="terminal-a"
  style={{ left: 0, top: '50%' }}
/>
```

Pontos corretos por componente:

| Nó          | terminal-a                              | terminal-b                            | terminal-ter          |
|-------------|-----------------------------------------|---------------------------------------|-----------------------|
| DJNode      | extremidade esquerda do wire            | extremidade direita do wire           | —                     |
| CHNode      | extremidade esquerda do wire            | extremidade direita do wire           | —                     |
| ReligadorNode | extremidade esquerda do wire          | extremidade direita do wire           | —                     |
| TFNode      | extremidade esquerda do wire            | extremidade direita do wire           | —                     |
| TF3Node     | extremidade esquerda do wire            | extremidade direita do wire           | base do 3º círculo    |
| TCNode      | extremidade esquerda do wire            | extremidade direita do wire           | —                     |
| TPNode      | topo do wire vertical (acima círculos)  | —                                     | —                     |

Revisar todos os `nodes/*.tsx` e corrigir as posições.

---

## CORREÇÃO 3 — Propagação de cor dinâmica no modo GRAVANDO

### Regras

1. Barra com `fonte: true` emite `VOLTAGE_COLORS[tensao]`
2. Wire saindo da barra fonte herda essa cor
3. Ao atravessar DJ / CH / Religador:
   - **Fechado** → cor continua propagando
   - **Aberto** → propagação interrompida; wire à frente fica cinza (`#94a3b8`)
4. Barra de transferência recebe a cor se o caminho até ela estiver fechado;
   caso contrário permanece cinza
5. Barra dupla: a barra com `fonte: true` emite cor; a outra recebe cor
   somente se houver caminho fechado conectando as duas

### Implementação

Criar `frontend/src/utils/colorPropagation.ts`:

```typescript
export function calculatePropagatedColors(
  nodes: Node[],
  edges: Edge[],
): {
  edgeColors: Map<string, string>
  nodeColors: Map<string, string>
}
```

Algoritmo BFS/DFS a partir de cada barra fonte:
- Visita arestas e nós adjacentes
- Propaga cor enquanto equipamentos estão fechados
- Interrompe ao encontrar equipamento aberto (aresta à frente = cinza)
- Nós sem caminho fechado até eles = cinza

Integração no `editorStore`:
- Executar `calculatePropagatedColors` **somente no modo GRAVANDO**
- Disparar **somente quando DJ, CH ou Religador mudar de estado**
- Armazenar resultado em `editorStore.propagatedColors`
- Canvas aplica cores nas edges via `style` dinâmico

No modo **CONFIGURAÇÃO**: sem propagação. Cada barra exibe
`VOLTAGE_COLORS[tensao]` e os wires exibem a cor da barra de origem.

---

## CORREÇÃO 4 — Lock de edição: liberar ao sair da página

O lock não é liberado quando o usuário fecha o navegador ou navega
para fora da página de edição.

### Frontend

Criar ou corrigir hook `useSubstationLock.ts`:

```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    fetch(`/api/v1/substations/${substationId}/lock`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id }),
      keepalive: true,  // CRÍTICO: garante envio ao fechar a aba
    });
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    unlockSubstation(substationId, currentUser.id); // navegação interna
  };
}, [substationId, currentUser.id]);
```

Adicionar heartbeat a cada 5 minutos para manter o lock ativo:

```typescript
const interval = setInterval(() => {
  fetch(`/api/v1/substations/${substationId}/lock/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUser.id }),
  });
}, 5 * 60 * 1000);

return () => clearInterval(interval);
```

### Backend

Em `lock_service.py`:

```python
LOCK_TIMEOUT_MINUTES = 30

def is_lock_expired(locked_at: datetime) -> bool:
    return datetime.utcnow() - locked_at > timedelta(minutes=LOCK_TIMEOUT_MINUTES)
```

- Em `GET /substations/{id}` e `POST /substations/{id}/lock`: se o lock
  existente estiver expirado, liberá-lo automaticamente (não retornar 423)
- Adicionar endpoint:

```
POST /api/v1/substations/{id}/lock/heartbeat
body: { user_id }
```

Atualiza `locked_at` para `now()` se o lock pertencer ao `user_id`.
Retorna 200 se ok, 403 se o lock pertence a outro usuário.

---

## TESTES

Suba os containers após cada correção:
```
sg docker -c "docker compose up -d"
```

**Correção 1 — Barra unificada**
- [ ] Toolbar exibe apenas um item "Barra"
- [ ] Modal ao criar barra: campos tipo, fonte, tensão, nome
- [ ] Visual correto conforme tipo (espessa / fina / dupla)
- [ ] Ícone ⚡ visível na barra com `fonte: true`

**Correção 2 — Wire**
- [ ] Wire sai e chega exatamente nos terminais visuais de cada símbolo
- [ ] Sem gaps ou desalinhamentos entre wire e componente

**Correção 3 — Propagação de cor**
- [ ] Modo GRAVANDO: wire herda cor da barra fonte
- [ ] Abrir DJ/CH interrompe propagação — wire à frente fica cinza
- [ ] Fechar DJ/CH retoma propagação — wire volta à cor da tensão
- [ ] Barra de transferência: cinza por padrão, colore com caminho fechado
- [ ] Modo CONFIGURAÇÃO: sem propagação dinâmica

**Correção 4 — Lock**
- [ ] Fechar aba libera o lock imediatamente
- [ ] Navegar para outra página libera o lock
- [ ] Lock expirado (30 min sem heartbeat) liberado automaticamente
- [ ] Heartbeat mantém lock ativo enquanto página aberta

Marque os itens correspondentes como [x] em @docs/implementation-plan.md.
Não commite — avise quando terminar para revisão.
