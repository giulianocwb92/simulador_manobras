#!/usr/bin/env bash
# Sobe a stack e prepara o ambiente para homologação manual da refatoração de
# símbolos do editor de topologia (docs/refatorar_simbolos.md).
set -euo pipefail

FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:8000/docs"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }

if ! systemctl is-active --quiet docker 2>/dev/null; then
  log "Docker não está ativo. Rode em outro terminal: sudo systemctl start docker"
  exit 1
fi

DOCKER_CMD="docker"
if ! docker info >/dev/null 2>&1; then
  if command -v sg >/dev/null 2>&1 && sg docker -c "docker info" >/dev/null 2>&1; then
    DOCKER_CMD="sg docker -c"
  else
    log "Usuário atual sem permissão no socket do Docker e o workaround 'sg docker' também falhou."
    log "Adicione seu usuário ao grupo docker (sudo usermod -aG docker \$USER) e reinicie a sessão, ou rode este script com sudo."
    exit 1
  fi
fi

run_docker() {
  if [ "$DOCKER_CMD" = "docker" ]; then
    docker "$@"
  else
    sg docker -c "docker $*"
  fi
}

cd "$(dirname "$0")/.."

log "Subindo containers (docker compose up -d --build)"
run_docker compose up -d --build

log "Aguardando backend responder em $BACKEND_URL"
for i in $(seq 1 60); do
  if curl -sf "$BACKEND_URL" >/dev/null 2>&1; then break; fi
  sleep 2
  if [ "$i" -eq 60 ]; then
    log "Backend não respondeu a tempo. Verifique: docker compose logs backend"
    exit 1
  fi
done

log "Aguardando frontend responder em $FRONTEND_URL"
for i in $(seq 1 60); do
  if curl -sf "$FRONTEND_URL" >/dev/null 2>&1; then break; fi
  sleep 2
  if [ "$i" -eq 60 ]; then
    log "Frontend não respondeu a tempo. Verifique: docker compose logs frontend"
    exit 1
  fi
done

log "Ambiente pronto."

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$FRONTEND_URL" >/dev/null 2>&1 || true
fi

cat <<EOF

$(printf '\033[1m%s\033[0m' "Roteiro de homologação — refatoração de símbolos (docs/refatorar_simbolos.md)")

URL: $FRONTEND_URL
Identifique-se com qualquer nome/email na tela inicial (sem autenticação real na v1).

Crie uma subestação nova (ex: "SE Homologação") e, no editor, confira:

  [ ] 1. Arraste cada componente da toolbar e compare com as imagens de
         referência (frontend/src/assets/referencias/):
         - Disjuntor: quadrado no meio do fio, verde=fechado / vermelho=aberto
         - Chave Seccionadora: aberta = lâmina diagonal / fechada = dois círculos
         - Religador: igual ao disjuntor, com "R" branco no meio
         - TF 2 Enrolamentos: dois círculos tangentes horizontais
         - TF 3 Enrolamentos: três círculos em triângulo + terminal inferior
         - TP: vertical por padrão, dois círculos + símbolo de terra na base
         - TC: círculo único passante, com handles nos dois lados
         - Barra Principal: linha grossa (6px)
         - Barra Transferência: linha fina (2px)
         - Barra Dupla: duas barras empilhadas (B1/B2) num único bloco

  [ ] 2. Defina uma Barra Principal com uma tensão (ex: 138 kV) e conecte um
         Disjuntor a ela — o fio deve sair em ângulo reto (não curvo) e ficar
         colorido igual à cor da barra.

  [ ] 3. Deixe um fio sem conexão numa ponta — deve aparecer com contorno
         cinza (sem cor de tensão).

  [ ] 4. Selecione um equipamento (DJ, CH, Religador, TF, TF3, TP ou TC) e
         aperte Ctrl+R — ele deve girar 90°. Teste também o botão
         "Rotacionar" da toolbar (só fica ativo com um nó selecionado).

  [ ] 5. Confira que TF3 e Barra Dupla aparecem na toolbar e inserem
         corretamente no canvas.

  [ ] 6. Clique em "Salvar subestação" e recarregue a página — a topologia
         (incluindo cor/rotação) deve persistir.

Fora de escopo nesta rodada (ainda não implementado — FASE 6):
  - Clicar num DJ/CH em modo GRAVANDO para abrir/fechar não existe ainda;
    clicar sempre abre o modal de edição de propriedades.

Para parar os containers depois: docker compose down
EOF
