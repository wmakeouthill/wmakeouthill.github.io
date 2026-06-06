#!/usr/bin/env bash
# Supervisor simples para o modo SSR/edge: sobe o renderer Node (@angular/ssr)
# e o edge Spring no mesmo container e derruba o container se qualquer um morrer
# (o orquestrador então reinicia). tini é o PID 1 e cuida do reaping de zumbis.
set -euo pipefail

NODE_SSR_PORT="${NODE_SSR_PORT:-4000}"
SERVER_PORT="${SERVER_PORT:-8080}"

echo "[entrypoint] starting Node SSR renderer on :${NODE_SSR_PORT}"
PORT="${NODE_SSR_PORT}" node /app/ssr/server/server.mjs &
NODE_PID=$!

echo "[entrypoint] starting Spring edge on :${SERVER_PORT}"
# shellcheck disable=SC2086  # JAVA_OPTS precisa expandir em múltiplos argumentos
java ${JAVA_OPTS:-} -Djava.security.egd=file:/dev/./urandom -jar /app/app.jar &
JAVA_PID=$!

terminate() {
  echo "[entrypoint] shutting down (forwarding TERM to both processes)"
  kill -TERM "${NODE_PID}" "${JAVA_PID}" 2>/dev/null || true
}
trap terminate TERM INT

# Encerra assim que QUALQUER um dos dois processos terminar (renderer ou edge).
wait -n "${NODE_PID}" "${JAVA_PID}"
EXIT_CODE=$?
echo "[entrypoint] a process exited (code ${EXIT_CODE}); stopping the other"
terminate
wait || true
exit "${EXIT_CODE}"
