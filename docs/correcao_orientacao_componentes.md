# Correção: Orientação padrão dos componentes no canvas

Leia @docs/editor-topology.md antes de começar.

---

## Contexto

A orientação padrão dos componentes precisa refletir o uso real em
diagramas unifilares de subestação: a barra é o elemento estrutural
vertical e os equipamentos de manobra (DJ, chave, religador) saem
dela na horizontal.

---

## ALTERAÇÃO 1 — BarraNode: orientação padrão vertical

A barra deve ser renderizada na **vertical** ao ser solta no canvas.

### Visual
- Linha vertical (em vez de horizontal)
- `stroke-width` mantém o mesmo por `tipo` (6px principal/dupla, 2px transferência)
- Comprimento padrão: 200px na vertical

### Handles
- `Position.Left` — lado esquerdo (múltiplos handles distribuídos ao longo da barra)
- `Position.Right` — lado direito (múltiplos handles distribuídos ao longo da barra)
- Remover handles de topo e base que existiam na orientação horizontal

### Rotação via Ctrl+R
- Continua disponível para casos em que o engenheiro prefira a barra horizontal
- Ao rotacionar 90°, os handles devem inverter: Left/Right → Top/Bottom

### Inicialização no canvas
Ao soltar a barra pela Toolbar, o nó deve iniciar com:
```typescript
data: {
  ...dadosPadrao,
  rotation: 90, // graus — representa orientação vertical
}
```
Ou, se a rotação for controlada via transform CSS, garantir que o
estado inicial do componente já renderize vertical sem interação do usuário.

---

## ALTERAÇÃO 2 — DisjuntorNode, ChaveNode, ReligadorNode: orientação padrão horizontal

Esses três componentes devem ser renderizados na **horizontal** ao ser
soltos no canvas.

### Visual
- Símbolo orientado horizontalmente (terminal esquerdo → terminal direito)
- Handles em `Position.Left` e `Position.Right`

### Rotação via Ctrl+R
- Continua disponível para rotação em 90° (caso precise sair verticalmente de uma barra horizontal)
- Ao rotacionar, handles invertem: Left/Right → Top/Bottom

### Inicialização no canvas
```typescript
data: {
  ...dadosPadrao,
  rotation: 0, // horizontal é o padrão
}
```

---

## ALTERAÇÃO 3 — Hook useNodeRotation: garantir handles dinâmicos

Verificar se o hook `useNodeRotation` já trata a inversão de handles
conforme a rotação. Se não tratar, implementar:

```typescript
// Lógica esperada dentro do hook
const isVertical = rotation === 90 || rotation === 270;

const sourcePosition = isVertical ? Position.Bottom : Position.Right;
const targetPosition = isVertical ? Position.Top   : Position.Left;
```

Para a `BarraNode` (que tem múltiplos handles ao longo do corpo):

```typescript
const handlePositions = isVertical
  ? [Position.Left, Position.Right]   // barra vertical: saídas laterais
  : [Position.Top,  Position.Bottom]; // barra horizontal: saídas acima/abaixo
```

---

## Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `BarraNode.tsx` | orientação padrão → vertical; handles Left/Right |
| `DisjuntorNode.tsx` | orientação padrão → horizontal; handles Left/Right |
| `ChaveNode.tsx` | orientação padrão → horizontal; handles Left/Right |
| `ReligadorNode.tsx` | orientação padrão → horizontal; handles Left/Right |
| `useNodeRotation.ts` | garantir inversão de handles conforme rotação |
| `Toolbar.tsx` | nenhuma mudança necessária (orientação é do componente, não da toolbar) |

---

## O que NÃO mudar

- Lógica de propagação de cor (Correção 3 do arquivo anterior)
- Lógica de lock de edição
- Símbolos SVG em si — apenas a orientação de renderização
- Atalho Ctrl+R e incremento de 90°

---

## Verificação após implementação

1. Soltar uma barra no canvas → deve aparecer vertical sem nenhum Ctrl+R
2. Soltar um DJ no canvas → deve aparecer horizontal
3. Soltar uma chave → horizontal
4. Soltar um religador → horizontal
5. Ctrl+R em qualquer componente → rotaciona 90° corretamente
6. Conectar um wire de uma saída lateral da barra a um terminal do DJ → wire deve ligar nos pontos corretos dos SVGs
