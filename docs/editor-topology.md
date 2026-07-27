# Editor de Topologia

> Este documento é a spec original do editor. Vários detalhes abaixo foram revisados
> durante a implementação (grid, orientação padrão, wire ortogonal, barra unificada,
> propagação de cor) — as seções afetadas têm uma nota "Atualizado". Para o estado
> consolidado ver `docs/status.md`; para o histórico de cada mudança, `git log`.

## Biblioteca: React Flow

React Flow é a escolha para o canvas. Motivos:
- Modelo nativo de nós + arestas (mapeamento direto para equipamentos + conexões)
- Suporte a tipos customizados de nó (cada equipamento tem seu próprio componente React)
- Handle system para terminais de conexão
- Drag-and-drop nativo, zoom, pan
- Serialização/deserialização JSON nativa

## Grid snap

> **Atualizado**: a grade final é de **6px**, não 20px. 10px foi tentado e descartado —
> não divide os 12px de offset do terminal vertical dos componentes de 24px, o que
> deixava cotovelos residuais nos wires (ver `frontend/src/utils/barraLayout.ts`).

```typescript
// Em ReactFlow component
<ReactFlow
  snapToGrid={true}
  snapGrid={[6, 6]}   // grade de 6px
  ...
/>
```

## Tipos de nó e seus handles

Cada tipo de equipamento é um componente React registrado em `nodes/`.

### BarraNode

> **Atualizado**: `BarraPrincipalNode`/`BarraTransferenciaNode`/`BarraDuplaNode` foram
> unificados num único `BarraNode`, parametrizado por `data.tipo: 'principal' |
> 'transferencia' | 'dupla'` (espessura e cor variam por tipo) e `data.fonte: boolean`
> (barra que inicia a propagação de cor no modo GRAVANDO — ver seção própria abaixo).
> Orientação padrão é **vertical**, rotacionável com Ctrl+R. Handles não são mais criados
> automaticamente por conexão: com a ferramenta Wire ativa (tecla `W`), o usuário clica num
> ponto da barra e um handle é criado ali (`data.handles: {id, position: 0.0–1.0}[]`).

```
┌─────────────────────────────────┐
│         BARRA 138 kV            │
│  ●  ●  ●  ●  ●  ●  ●  ●  ●   │  ← handles dinâmicos (criados via ferramenta Wire)
└─────────────────────────────────┘
```
- Cor por nível de tensão (ver tabela abaixo), exceto barra `transferencia` sem cor
  propagada (cinza `#94a3b8` por padrão)

### DJNode (Disjuntor), CHNode (Chave), ReligadorNode, TFNode, TF3Node

> **Atualizado**: orientação padrão é **horizontal** (terminal-a à esquerda, terminal-b à
> direita), rotacionável em 90° com Ctrl+R — os diagramas abaixo (handles top/bottom)
> refletem a spec original, já superada. Todos compartilham o wrapper
> `frontend/src/nodes/EquipmentNodeShell.tsx`. `TF3Node` (3 enrolamentos) existe como nó
> separado do `TFNode` (2 enrolamentos), com terminal terciário adicional.

```
    ● terminal-a (left)
    │
   [52]───   ← símbolo: quadrado, verde=fechado / vermelho=aberto (DJ/Religador),
    │           lâmina diagonal ou contatos (CH)
    ● terminal-b (right)
```
- 2 handles: `terminal-a`, `terminal-b` (mais `terminal-ter` no TF3Node, terciário)
- DJ/CH/Religador: estado visual **fechado = vermelho, aberto = verde** (nota: invertido
  em relação à primeira versão da spec — ver `docs/status.md`)
- Labels: `DJ 52-01`, `CH 29-01`, nome livre do religador, `TF-01`/`TF-A`

### TPNode / TCNode
```
    ● terminal-a (left) — derivação da barra
   [TP]
```
- 1 handle de derivação (conecta lateralmente na barra)

### LinhaNode
```
   [LINHA]──────→ (conecta a outra SE)
    ●  terminal-a (top)
```
- 1 handle de entrada (conecta ao barramento da SE)
- Propriedade: `destino_se_id` (qual SE está na outra ponta)
- Visualmente indica o nome da SE destino

## Cores por nível de tensão

| Tensão (kV) | Cor da barra | Hex       |
|-------------|--------------|-----------|
| 230         | Laranja      | `#FF6B00` |
| 138         | Vermelho     | `#CC0000` |
| 88          | Roxo         | `#7B2D8B` |
| 69          | Azul escuro  | `#003087` |
| 34.5        | Verde        | `#006400` |
| 13.8        | Azul claro   | `#0066CC` |

## Validação de conexão

Implementada no callback `onConnect` do React Flow:

```typescript
const onConnect = (connection: Connection) => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);

  // Regra 1: tensões diferentes sem TF → rejeitar
  if (tensaoIncompativel(sourceNode, targetNode)) {
    toast.error('Não é possível conectar barras de tensões diferentes sem transformador');
    return;
  }

  // Regra 2: Linha só conecta em barras ≥ 69 kV
  if (targetNode.type === 'linha' && sourceNode.data.tensao < 69) {
    toast.error('Bloco Linha só pode ser conectado em barras de 69 kV ou superior');
    return;
  }

  addEdge(connection);
};
```

## Ferramenta Wire e propagação de cor (adicionado após a spec original)

- **Ferramenta Wire** (tecla `W` ou botão na toolbar, estilo LTSpice): ativa modo
  crosshair, clique-clique para criar uma edge; `Esc`/`Del` cancela. Edges são
  ortogonais (`type: "step"` do React Flow), com `sourcePosition`/`targetPosition`
  calculados a partir da rotação do nó (`frontend/src/utils/edgePositions.ts`) para evitar
  cotovelos errados quando um componente está rotacionado.
- **Propagação de cor** (`frontend/src/utils/colorPropagation.ts`): só no modo GRAVANDO.
  BFS a partir de cada barra com `fonte: true`, propagando `VOLTAGE_COLORS[tensao]` pelos
  wires enquanto DJ/CH/Religador no caminho estiverem fechados; interrompe (wire cinza
  `#94a3b8`) ao encontrar um aberto. Recalculado só quando um desses equipamentos muda de
  estado. No modo CONFIGURAÇÃO não há propagação — cada barra/wire mostra a cor estática
  da própria tensão.
- Cores centralizadas em `frontend/src/constants/voltageColors.ts` — qualquer código novo
  deve importar dali, nunca hardcodar hex de tensão.

## Toolbar de componentes

Painel lateral esquerdo com os blocos arrastáveis:

```
┌──────────────┐
│  W  Wire     │  ← toggle, ativa modo crosshair
│  ↻  Rotacionar│  ← ativo só com nó selecionado
├──────────────┤
│  COMPONENTES │
├──────────────┤
│ ▬ Barra      │  ← modal: tipo/fonte/tensão/nome
│ ⊠ Disjuntor  │
│ ∕ Chave      │
│ ◎ Transform. │
│ ◉ TF 3 Enrol.│
│ ® Religador  │
│ T TP / TC    │
│ → Linha      │
├──────────────┤
│ PROVISÓRIOS  │
├──────────────┤
│ ⋯ Jumper     │
│ ∕ Ch. Prov.  │
└──────────────┘
```

Drag-and-drop do toolbar para o canvas usando `onDrop` + `onDragOver` do React Flow.

## Modos do editor

Controlados por `editorStore.mode`:

### CONFIGURAÇÃO
- Usuário pode: adicionar/remover/mover equipamentos, editar propriedades, conectar
- Clicar num DJ/CH/Religador abre modal de propriedades
- Botão "Iniciar Gravação" → muda para GRAVANDO

### GRAVANDO
- Equipamentos não podem ser movidos ou adicionados
- Clicar num DJ/CH/Religador executa ABRIR ou FECHAR (toggle do estado atual)
- Cada clique gera um passo na manobra automaticamente
- Painel direito mostra lista de passos em tempo real
- Equipamentos abertos têm visual distinto (cor de fundo diferente)
- Botão "Finalizar Gravação" → muda para FINALIZADA

### FINALIZADA
- Canvas somente leitura
- Usuário edita passos no painel direito
- Pode adicionar passos manuais (texto livre)
- Pode reordenar passos (drag-and-drop na lista)
- Pode deletar passos
- Botão "Gerar PDF"

## Painel de propriedades (ao adicionar componente)

Modal exibido ao arrastar componente para o canvas:

**Barra**:
- Nome (livre)
- Nível de tensão (select: 230 / 138 / 88 / 69 / 34.5 / 13.8)

**Disjuntor / Chave**:
- Número (ex: `01` → gera `DJ 52-01` automaticamente)
- Estado inicial (aberto / fechado)

**Transformador**:
- Identificador (letra ou número → `TF-A` ou `TF-01`)
- Tensão AT (select)
- Tensão BT (select)
- Tem terciário? (checkbox) → Tensão terciário (select)
- Potência (MVA)

**Linha**:
- Nome da linha
- SE destino (select das SEs cadastradas — aparece quando há 2+ SEs na manobra)

## Salvamento da topologia

- Auto-save a cada 30s enquanto em CONFIGURAÇÃO (`PUT /substations/{id}` — `api-contracts.md`
  não define um PATCH dedicado como uma versão anterior deste documento sugeria)
- Salvar manual: botão "Salvar Subestação"
- Ao salvar, versão anterior é preservada em `substation_versions`
- Lock liberado automaticamente ao sair da página ou após 30min de inatividade
