# Modelo de Domínio — Simulador de Manobras

## Entidades principais

### Subestação (Substation)
- Possui nome, sigla (ex: SE-CBA), e lista de equipamentos
- Topologia serializada em JSON (nós + arestas do React Flow)
- Pode ser bloqueada por um usuário (lock de edição)
- Versões imutáveis: ao salvar, a versão anterior é preservada

### Equipamento (Node — tipos)
Cada equipamento é um nó no grafo da subestação:

| Tipo       | Código COPEL | Terminais | Estado         |
|------------|--------------|-----------|----------------|
| Disjuntor  | 52-xx        | 2 (A / B) | aberto/fechado |
| Chave      | 29-xx        | 2 (A / B) | aberto/fechado |
| Transformador | TF-xx / TF-A | 2 (AT / BT), opcional 3 (terciário) | — |
| Barra      | —            | N         | — |
| Religador  | —            | 2 (A / B) | aberto/fechado |
| TP         | —            | 1 (derivação) | — |
| TC         | —            | 1 (derivação) | — |
| Linha      | —            | 1 (saída SE) | — |

### Níveis de tensão
`[230, 138, 88, 69, 34.5, 13.8]` kV

- Regra de validação: dois nós de tensões diferentes **não podem ser conectados** sem um TF entre eles
- Barras de 13,8 e 34,5 kV **não têm saída de linha** (bloco Linha só conecta em barras ≥ 69 kV)
- TF tem lado AT e lado BT; a tensão de cada lado é definida ao inserir o componente

### Nomenclatura COPEL
- Disjuntores: `DJ 52-xx` (ex: `DJ 52-01`)
- Chaves: `CH 29-xx` (ex: `CH 29-03`)
- Transformadores:
  - Rede básica (interliga barras AT): letras → `TF-A`, `TF-B`
  - Atendimento de carga: números → `TF-01`, `TF-02`
  - TFs 230 kV de carga: usam número mesmo em AT alta

## Fluxo de estados da subestação no editor

```
CONFIGURAÇÃO → GRAVANDO → FINALIZADA
```

1. **CONFIGURAÇÃO**: usuário posiciona equipamentos e define estado inicial
   (ex: fecha DJs e chaves que estão normalmente fechados na operação real)
2. **GRAVANDO**: cada clique em um equipamento (abrir/fechar) gera um passo na manobra
3. **FINALIZADA**: sequência encerrada, usuário edita lista de passos e exporta PDF

## Manobra (Maneuver)

- Referencia 1 ou mais subestações
- Contém lista ordenada de passos
- Cada passo tem: `ordem`, `descricao`, `equipamento_id`, `acao` (ABRIR/FECHAR), `origem` (SIMULADOR/MANUAL)
- Passos gerados pelo simulador: `"Abrir DJ 52-01 — verificar indicação de aberto no painel"`
- Passos manuais: texto livre inserido pelo engenheiro
- Possui cabeçalho: número, data, SEs envolvidas, responsável, descrição do isolamento
- PDF gerado segue template COPEL (a ser fornecido pelo usuário)

### Texto gerado por ação

| Ação   | Equipamento | Texto gerado                                              |
|--------|-------------|-----------------------------------------------------------|
| ABRIR  | Disjuntor   | `Abrir DJ 52-xx — verificar indicação de aberto no painel` |
| FECHAR | Disjuntor   | `Fechar DJ 52-xx — verificar indicação de fechado no painel` |
| ABRIR  | Chave       | `Abrir CH 29-xx — verificar posição aberta`               |
| FECHAR | Chave       | `Fechar CH 29-xx — verificar posição fechada`             |
| ABRIR  | Religador   | `Abrir Religador [nome] — verificar indicação de aberto`  |
| FECHAR | Religador   | `Fechar Religador [nome] — verificar indicação de fechado`|

## Elementos provisórios

Podem ser adicionados ao diagrama durante a manobra:
- **Jumper**: conexão elétrica temporária entre dois pontos
- **Chave provisória**: chave não permanente instalada para a manobra

Cada elemento provisório tem flag `permanente: boolean`.
- Se `permanente = false`: aparece na manobra mas **não** atualiza a topologia base da SE
- Se `permanente = true`: ao finalizar a manobra, é incorporado à topologia base

## Lock de edição

- Campo `locked_by` (user_id) + `locked_at` (timestamp) na tabela `substations`
- Timeout automático: 30 minutos de inatividade libera o lock
- Segundo usuário que tenta editar recebe status 423 (Locked) com info de quem está editando
- Visualização da topologia sempre disponível (sem lock)

## Histórico de manobras

- Manobras finalizadas ficam no histórico permanentemente
- Operações disponíveis: consultar, visualizar, baixar PDF, **clonar**
- Clonar cria nova manobra em estado rascunho com mesma sequência de passos
- Busca por: subestação, data, responsável
