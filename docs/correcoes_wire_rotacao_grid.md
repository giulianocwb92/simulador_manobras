# Correções do editor de topologia — Wire, Rotação, Grid e Labels

Leia @docs/editor-topology.md antes de começar.
São 6 correções. Implemente na ordem abaixo — cada uma depende da anterior.

---

## CORREÇÃO 1 — Grid de 10px

Reduzir o snap grid de 20px para 10px em todo o canvas.

```tsx
// Canvas.tsx
<ReactFlow
  snapToGrid={true}
  snapGrid={[10, 10]}
  ...
/>
```

Atualizar qualquer constante `GRID_SIZE` ou similar que exista no código.

---

## CORREÇÃO 2 — Ferramenta Wire (tecla W / botão na toolbar)

Implementar modo wire inspirado no LTSpice: o usuário ativa a ferramenta,
clica para iniciar o wire, clica novamente para finalizar.

### Fluxo de interação

1. Usuário pressiona **W** ou clica no botão Wire na toolbar
2. Cursor muda para crosshair (`cursor: crosshair`)
3. Usuário clica num ponto do canvas (ou num handle de componente) → inicia wire
4. Uma linha ortogonal segue o cursor em tempo real mostrando o trajeto
5. Usuário clica novamente → finaliza wire, cria a edge
6. A ferramenta permanece ativa para o próximo wire
7. Usuário pressiona **Esc** ou **Del** → desativa a ferramenta wire,
   cursor volta ao normal

### Estado no editorStore

```typescript
wireMode: boolean           // ferramenta wire ativa
wirePending: {              // wire em construção
  sourceNodeId: string
  sourceHandleId: string
  sourcePosition: XYPosition
} | null
```

### Preview do wire

Enquanto o wire está sendo desenhado (entre o clique inicial e o final),
renderizar uma edge temporária do tipo `step` seguindo o cursor.
Usar um componente `WirePreview` sobreposto ao canvas via SVG absoluto.

### Ativação por handle ou por barra

- Se o clique inicial for em cima de um **handle** de componente:
  inicia o wire a partir desse handle
- Se o clique inicial for em cima de uma **barra**:
  cria um handle dinâmico no ponto exato do clique (ver Correção 3)
  e inicia o wire a partir dele

### Botão na toolbar

Adicionar na toolbar, acima dos separadores de componentes:

```
┌─────────────────────┐
│  W  Wire            │  ← toggle, destacado quando ativo
│  ↻  Rotacionar      │
├─────────────────────┤
│  BARRAS ...         │
```

### Atalhos de teclado

- **W**: ativa ferramenta wire
- **Esc** ou **Del**: desativa ferramenta wire (se wire pendente, cancela)

Implementar em `useEditorShortcuts.ts` junto com o Ctrl+R existente.

---

## CORREÇÃO 3 — Handles dinâmicos nas barras

Barras não têm handles fixos. O handle é criado no ponto exato onde
o usuário clica com a ferramenta wire ativa.

### Implementação

Campo `handles` em `data` da barra:

```typescript
handles: Array<{
  id: string
  position: number  // 0.0 a 1.0 — posição relativa ao longo da barra
}>
```

Quando o usuário clica numa barra com a ferramenta wire ativa:
1. Calcular a posição relativa do clique ao longo da barra (0.0 = início, 1.0 = fim)
2. Adicionar `{ id: crypto.randomUUID(), position }` ao array `handles` da barra
3. Renderizar o handle no `BarraNode` mapeando `position` para coordenada px
4. Iniciar o wire a partir desse handle

Os handles existentes são renderizados permanentemente na barra.
Quando a barra está vertical, `position` mapeia para o eixo Y em vez do X.

```tsx
// BarraNode.tsx — renderizar handles dinâmicos
{data.handles.map(h => (
  <Handle
    key={h.id}
    id={h.id}
    type="source"
    position={data.rotation === 90 || data.rotation === 270
      ? Position.Left   // barra vertical: handles saem pela lateral
      : Position.Bottom // barra horizontal: handles saem pela base
    }
    style={data.rotation === 90 || data.rotation === 270
      ? { top: `${h.position * 100}%`, left: 0 }
      : { left: `${h.position * 100}%`, top: '100%' }
    }
  />
))}
```

---

## CORREÇÃO 4 — Rotação das barras

Barras passam a suportar rotação com Ctrl+R (mesmo mecanismo dos outros componentes).

### Comportamento

- **0° / 180°**: barra horizontal — handles saem pela base (Position.Bottom)
- **90° / 270°**: barra vertical — handles saem pela lateral (Position.Left ou Right)

Quando a barra rotaciona, os handles existentes reposicionam automaticamente
(a lógica de `position` 0.0–1.0 é relativa, então basta mudar o eixo de mapeamento).

### Visual

- Horizontal: linha espessa/fina da esquerda para a direita (comportamento atual)
- Vertical: linha espessa/fina de cima para baixo

O label da barra sempre horizontal (legível), posicionado fora do símbolo:
- Barra horizontal: label acima da linha
- Barra vertical: label à direita da linha

Remover a restrição atual que impede barras de rotacionar em `rotateSelectedNodes`.

---

## CORREÇÃO 5 — Wire ortogonal respeitando rotação do componente

O wire hoje sempre assume que o componente está horizontal, gerando
cotovelos errados quando o componente está rotacionado.

### Regra

O wire deve sair **perpendicular ao terminal** do componente conforme
sua rotação atual:

| Rotação | terminal-a sai para | terminal-b sai para |
|---------|--------------------|--------------------|
| 0°      | esquerda           | direita            |
| 90°     | cima               | baixo              |
| 180°    | direita            | esquerda           |
| 270°    | baixo              | cima               |

### Implementação

Ao criar uma edge, determinar `sourcePosition` e `targetPosition` dinamicamente
com base na rotação do nó de origem e destino:

```typescript
// utils/edgePositions.ts
export function getHandlePositions(node: Node): {
  'terminal-a': Position
  'terminal-b': Position
} {
  const rotation = node.data.rotation ?? 0
  switch (rotation) {
    case 0:   return { 'terminal-a': Position.Left,   'terminal-b': Position.Right }
    case 90:  return { 'terminal-a': Position.Top,    'terminal-b': Position.Bottom }
    case 180: return { 'terminal-a': Position.Right,  'terminal-b': Position.Left }
    case 270: return { 'terminal-a': Position.Bottom, 'terminal-b': Position.Top }
    default:  return { 'terminal-a': Position.Left,   'terminal-b': Position.Right }
  }
}
```

Aplicar `sourcePosition` e `targetPosition` em cada edge ao renderizar,
não fixar no componente. O React Flow usa esses campos para determinar
de qual lado do handle o wire parte, eliminando os cotovelos errados.

Quando um componente é rotacionado com Ctrl+R, recalcular as posições
de todas as edges conectadas a ele.

---

## CORREÇÃO 6 — Labels não rotacionam com o componente

Labels (nome e número do equipamento) devem sempre ser legíveis
(texto horizontal) e nunca sobrepor as linhas do símbolo.

### Implementação

O label não deve estar dentro do `div` que recebe o `transform: rotate()`.
Deve ser um elemento irmão, posicionado absolutamente fora do símbolo:

```tsx
// Estrutura correta de cada NodeComponent
<div className="relative">
  {/* Símbolo SVG — esse rotaciona */}
  <div style={{ transform: `rotate(${data.rotation ?? 0}deg)` }}>
    <svg>...</svg>
  </div>

  {/* Label — NUNCA dentro do div que rotaciona */}
  <div
    className="absolute text-[11px] whitespace-nowrap pointer-events-none"
    style={getLabelPosition(data.rotation)}
  >
    {data.label}
  </div>
</div>
```

Posição do label conforme rotação:

```typescript
function getLabelPosition(rotation: number): CSSProperties {
  switch (rotation) {
    case 0:   return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4 }
    case 90:  return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 4 }
    case 180: return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4 }
    case 270: return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 4 }
    default:  return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4 }
  }
}
```

Aplicar esse padrão em **todos** os `nodes/*.tsx`:
DJNode, CHNode, ReligadorNode, TFNode, TF3Node, TPNode, TCNode, BarraNode.

---

## TESTES

Suba os containers após implementar todas as correções:
```
sg docker -c "docker compose up -d"
```

**Correção 1 — Grid**
- [ ] Componentes encaixam em grid de 10px
- [ ] DJ alinha com a barra sem gap

**Correção 2 — Ferramenta Wire**
- [ ] Tecla W ativa o modo wire (cursor vira crosshair)
- [ ] Botão Wire na toolbar ativa/desativa o modo
- [ ] Clique inicia wire, segundo clique finaliza
- [ ] Esc ou Del desativa a ferramenta
- [ ] Preview ortogonal segue o cursor durante o desenho

**Correção 3 — Handles dinâmicos**
- [ ] Clicar na barra com wire ativo cria handle no ponto exato do clique
- [ ] Handle permanece visível na barra após criado
- [ ] Múltiplos handles podem ser criados na mesma barra

**Correção 4 — Rotação das barras**
- [ ] Ctrl+R rotaciona barra de horizontal para vertical
- [ ] Handles reposicionam corretamente ao longo do novo eixo
- [ ] Label permanece horizontal e legível em qualquer rotação

**Correção 5 — Wire ortogonal por rotação**
- [ ] Wire sai perpendicular ao terminal conforme rotação do componente
- [ ] DJ vertical: wire sai pelo topo e pela base, sem cotovelo lateral errado
- [ ] Rotacionar componente com wire já conectado atualiza o cotovelo

**Correção 6 — Labels**
- [ ] Labels sempre horizontais e legíveis em qualquer rotação
- [ ] Labels não sobrepõem as linhas do símbolo SVG
- [ ] Labels reposicionam fora do símbolo conforme rotação

Marque os itens correspondentes como [x] em @docs/implementation-plan.md.
Não commite — avise quando terminar para revisão.
