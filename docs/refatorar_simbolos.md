# Tarefa: Refatoração de Símbolos do Editor de Topologia

Leia @docs/editor-topology.md antes de começar.

Refatore todos os símbolos do editor de topologia para reproduzir fielmente
as imagens de referência abaixo. Implemente também wire ortogonal, cores por
nível de tensão e rotação com Ctrl+R.

As imagens de referência estão em:
@frontend/src/assets/referencias/chave_seccionadora_aberta.png
@frontend/src/assets/referencias/chave_seccionadora_fechada.png
@frontend/src/assets/referencias/disjuntor.png
@frontend/src/assets/referencias/religador.png
@frontend/src/assets/referencias/transformador_2_enrolamentos.png
@frontend/src/assets/referencias/transformador_3_enrolamentos.png
@frontend/src/assets/referencias/TP.png
@frontend/src/assets/referencias/TC.png

---

## 1. ORIENTAÇÃO PADRÃO DOS SÍMBOLOS

Todos os símbolos são HORIZONTAIS por padrão:
- Wire entra pelo terminal-a (LEFT handle) e sai pelo terminal-b (RIGHT handle)
- Exceção: TP é vertical por padrão (terminal-a TOP, terminal-b BOTTOM)
- O usuário rotaciona com Ctrl+R para mudar a orientação quando necessário

---

## 2. WIRE ORTOGONAL

Substituir roteamento atual por ortogonal (apenas segmentos horizontais e
verticais, cotovelo automático) usando edge type="step" do React Flow.

Regras de cor do wire:
- Conectado a uma barra: herda VOLTAGE_COLORS[tensao] da barra de origem
- Não conectado (floating): branco (#FFFFFF) com stroke cinza (#94a3b8)
  para ser visível no canvas
- Cor atualizada reativamente quando conexão muda

---

## 3. CORES POR NÍVEL DE TENSÃO

Criar `frontend/src/constants/voltageColors.ts`:

```typescript
export const VOLTAGE_COLORS: Record<number, string> = {
  230:  '#EA580C',
  138:  '#DC2626',
  88:   '#7C3AED',
  69:   '#1D4ED8',
  34.5: '#15803D',
  13.8: '#0284C7',
};

export const WIRE_UNCONNECTED_COLOR = '#FFFFFF';
export const WIRE_UNCONNECTED_STROKE = '#94a3b8';
```

Usar esta constante em todos os nós e edges — nunca hardcode de cor.
Aplicar às barras e aos wires que delas partem.

---

## 4. SÍMBOLOS POR COMPONENTE

Reproduzir fielmente a geometria de cada imagem de referência em SVG inline.

### Disjuntor (DJNode)
Referência: @frontend/src/assets/referencias/disjuntor.png
- Wire horizontal entra pela esquerda, passa por um quadrado, sai pela direita
- FECHADO: quadrado preenchido verde (#16a34a), borda (#15803d)
- ABERTO: quadrado preenchido vermelho (#dc2626), borda (#991b1b)
- Handles: terminal-a (LEFT), terminal-b (RIGHT)
- Label "DJ 52-xx" abaixo do símbolo, fonte 11px
- Suporta rotação (§6)

### Chave Seccionadora (CHNode)
Referência aberta:  @frontend/src/assets/referencias/chave_seccionadora_aberta.png
Referência fechada: @frontend/src/assets/referencias/chave_seccionadora_fechada.png
- ABERTO: wire horizontal — traço — lâmina diagonal 45° — traço — wire
  cor vermelho (#dc2626)
- FECHADO: wire horizontal — traço — dois pequenos círculos de contato
  alinhados — traço — wire, cor verde (#16a34a)
- Handles: terminal-a (LEFT), terminal-b (RIGHT)
- Label "CH 29-xx" abaixo, fonte 11px
- Suporta rotação (§6)

### Religador (ReligadorNode)
Referência: @frontend/src/assets/referencias/religador.png
- Idêntico ao Disjuntor geometricamente (quadrado no meio do wire horizontal)
- Letra "R" centralizada em branco dentro do quadrado
- FECHADO: fundo (#16a34a)
- ABERTO: fundo (#dc2626)
- Handles: terminal-a (LEFT), terminal-b (RIGHT)
- Label com nome abaixo, fonte 11px
- Suporta rotação (§6)

### Transformador 2 enrolamentos (TFNode)
Referência: @frontend/src/assets/referencias/transformador_2_enrolamentos.png
- Wire horizontal — dois círculos tangentes horizontais — wire horizontal
- Stroke preto, fill transparente (não é equipamento de manobra)
- Handles: terminal-a (LEFT), terminal-b (RIGHT)
- Label "TF-xx" abaixo, fonte 11px
- Suporta rotação (§6)

### Transformador 3 enrolamentos (TF3Node — novo componente)
Referência: @frontend/src/assets/referencias/transformador_3_enrolamentos.png
- Três círculos em arranjo triangular (dois no topo tangentes entre si,
  um centralizado abaixo tangente aos dois)
- Wire horizontal entra pela esquerda (à altura dos dois círculos superiores)
  e sai pela direita
- Terceiro terminal desce verticalmente da base do círculo inferior
- Stroke preto, fill transparente
- Handles: terminal-a (LEFT), terminal-b (RIGHT), terminal-ter (BOTTOM)
- Label "TF-xx" abaixo, fonte 11px
- Suporta rotação (§6)
- Registrar em nodeTypes junto com TFNode

### TP — Transformador de Potencial (TPNode)
Referência: @frontend/src/assets/referencias/TP.png
- Dois círculos tangentes VERTICAIS, wire vertical passando pelo centro
- Símbolo de terra (três linhas horizontais decrescentes) na base
- Orientação padrão: VERTICAL (único componente vertical por padrão)
- Stroke preto, fill transparente
- Não é equipamento de manobra — sem resposta a clique no modo GRAVANDO
- Handles: terminal-a (TOP)
- Label "TP" à direita, fonte 11px
- Suporta rotação (§6)

### TC — Transformador de Corrente (TCNode)
Referência: @frontend/src/assets/referencias/TC.png
- Círculo simples com o wire horizontal passando pelo seu centro
- Implementar como nó passante: dois handles alinhados horizontalmente
  (LEFT e RIGHT) com círculo SVG centralizado entre eles
- Stroke preto, fill transparente
- Não é equipamento de manobra — sem resposta a clique no modo GRAVANDO
- Handles: terminal-a (LEFT), terminal-b (RIGHT)
- Label "TC" acima, fonte 11px
- Suporta rotação (§6)

### Barra Principal (BarraPrincipalNode)
- Linha horizontal espessa (stroke-width: 6px)
- Cor: VOLTAGE_COLORS[tensao]
- Label "BP — xxx kV" acima da linha, mesma cor da barra
- Handles dinâmicos distribuídos ao longo da linha (tipo BOTTOM)
  criados conforme conexões são feitas
- Não suporta rotação

### Barra de Transferência (BarraTransferenciaNode)
- Linha horizontal fina (stroke-width: 2px)
- Cor: VOLTAGE_COLORS[tensao]
- Label "BT-xx — xxx kV" acima, mesma cor
- Mesma lógica de handles dinâmicos da BP
- Não suporta rotação

### Barra Dupla — B1 / B2 (BarraDuplaNode — novo componente)
- Duas entidades independentes com nome livre definido pelo usuário
- Visualmente igual à Barra Principal (stroke-width: 6px)
- Cor: VOLTAGE_COLORS[tensao]
- Label com nome + tensão acima
- DJ de acoplamento inserido manualmente pelo usuário entre as duas barras
- Não suporta rotação

---

## 5. TOOLBAR

Atualizar Toolbar.tsx com os novos tipos e botão de rotação:

```
┌─────────────────────┐
│  ↻  Rotacionar      │  ← ativo só com nó selecionado
├─────────────────────┤
│  BARRAS             │
│  ▬▬ Barra Principal │
│  ─  Barra Transfer. │
│  ══ Barra Dupla     │
├─────────────────────┤
│  EQUIPAMENTOS       │
│  ⊠  Disjuntor       │
│  ∕  Chave Secc.     │
│  ⊠R Religador       │
├─────────────────────┤
│  TRANSFORMADORES    │
│  ◎  TF 2 Enrol.     │
│  ◉  TF 3 Enrol.     │
│  TP Transf. Potenc. │
│  TC Transf. Corr.   │
├─────────────────────┤
│  LINHAS             │
│  →  Linha           │
├─────────────────────┤
│  PROVISÓRIOS        │
│  ⋯  Jumper          │
│  ∕p Chave Prov.     │
└─────────────────────┘
```

---

## 6. ROTAÇÃO — Ctrl+R

1. Adicionar campo `rotation: 0 | 90 | 180 | 270` em `data` de cada nó
   (default: 0)

2. Aplicar via CSS transform no wrapper SVG de cada componente:
```typescript
<div style={{ transform: `rotate(${data.rotation ?? 0}deg)` }}>
  {/* SVG */}
</div>
```

3. Listener global em SubstationEditorPage.tsx ou hook useEditorShortcuts:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      rotateSelectedNodes();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [rotateSelectedNodes]);
```

4. rotateSelectedNodes no editorStore:
   - Pega nós com selected: true
   - Incrementa data.rotation em 90, wrap 360 → 0
   - Atualiza handles conforme nova orientação:
     - 0°:   terminal-a = LEFT,   terminal-b = RIGHT
     - 90°:  terminal-a = TOP,    terminal-b = BOTTOM
     - 180°: terminal-a = RIGHT,  terminal-b = LEFT
     - 270°: terminal-a = BOTTOM, terminal-b = TOP

5. Botão ↻ na toolbar: mesmo comportamento do atalho, ativo só com nó selecionado

---

## 7. VALIDAÇÃO DE CONEXÃO

Manter validação de tensão incompatível já existente.
Adicionar:
- TC só aceita conexões nos handles LEFT e RIGHT (nó passante)
- Wire herda tensão da barra de origem; sem conexão → cor branca (#FFFFFF)

---

## 8. TESTES

Após implementar, suba os containers:
  sg docker -c "docker compose up -d"

Verificar no navegador:
- Cada símbolo reproduz fielmente a imagem de referência correspondente
- DJ e CH mudam de cor ao clicar no modo GRAVANDO
- Barra e wire exibem cor do nível de tensão correto
- Wire sem conexão aparece branco com contorno cinza
- Ctrl+R rotaciona componente selecionado em 90°
- Botão ↻ na toolbar tem mesmo efeito
- TF3 e Barra Dupla aparecem na toolbar e inserem no canvas
- Handles reposicionam corretamente após rotação

Marque os itens correspondentes como [x] em @docs/implementation-plan.md.
Não commite — avise quando terminar para revisão.
