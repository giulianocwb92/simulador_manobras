# Editor de Topologia

## Biblioteca: React Flow

React Flow é a escolha para o canvas. Motivos:
- Modelo nativo de nós + arestas (mapeamento direto para equipamentos + conexões)
- Suporte a tipos customizados de nó (cada equipamento tem seu próprio componente React)
- Handle system para terminais de conexão
- Drag-and-drop nativo, zoom, pan
- Serialização/deserialização JSON nativa

## Grid snap

```typescript
// Em ReactFlow component
<ReactFlow
  snapToGrid={true}
  snapGrid={[20, 20]}   // grade de 20px
  ...
/>
```

## Tipos de nó e seus handles

Cada tipo de equipamento é um componente React registrado em `nodes/`.

### BarraNode
```
┌─────────────────────────────────┐
│         BARRA 138 kV            │
│  ●  ●  ●  ●  ●  ●  ●  ●  ●   │  ← handles dinâmicos (N conexões)
└─────────────────────────────────┘
```
- Handles criados dinamicamente conforme equipamentos conectados
- Orientação horizontal, fluxo de cima para baixo
- Cor por nível de tensão (ver tabela abaixo)

### DJNode (Disjuntor)
```
    ● terminal-a (top)
    │
   [52]   ← símbolo: quadrado com X quando aberto
    │
    ● terminal-b (bottom)
```
- 2 handles fixos: `terminal-a` (top) e `terminal-b` (bottom)
- Estado visual: fechado = linha contínua / aberto = X no símbolo
- Label: `DJ 52-01`

### CHNode (Chave Seccionadora)
```
    ● terminal-a (top)
    │
   [/]   ← símbolo: linha diagonal quando aberta
    │
    ● terminal-b (bottom)
```
- 2 handles fixos: `terminal-a` (top) e `terminal-b` (bottom)
- Estado visual: fechado = linha reta / aberto = linha inclinada
- Label: `CH 29-01`

### TFNode (Transformador)
```
    ● terminal-at (top) — lado AT
    │
   (○○)  ← símbolo: dois círculos sobrepostos
    │
    ● terminal-bt (bottom) — lado BT
    │
    ● terminal-ter (bottom-right) — terciário (opcional)
```
- 2 handles obrigatórios + 1 opcional (terciário)
- Dados: `tensao_at`, `tensao_bt`, `tensao_ter?`, `potencia_mva`
- Label: `TF-01` ou `TF-A`

### ReligadorNode
```
    ● terminal-a (top)
    │
   [R]   ← símbolo: retângulo com R
    │
    ● terminal-b (bottom)
```

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

## Toolbar de componentes

Painel lateral esquerdo com os blocos arrastáveis:

```
┌──────────────┐
│  COMPONENTES │
├──────────────┤
│ ▬ Barra      │
│ ⊠ Disjuntor  │
│ ∕ Chave      │
│ ◎ Transform. │
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

- Auto-save a cada 30s enquanto em CONFIGURAÇÃO (PATCH na API)
- Salvar manual: botão "Salvar Subestação"
- Ao salvar, versão anterior é preservada em `substation_versions`
- Lock liberado automaticamente ao sair da página ou após 30min de inatividade
