#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${NODE_PID:-}" ]]; then kill "$NODE_PID" 2>/dev/null || true; fi
  if [[ -n "${PY_PID:-}" ]]; then kill "$PY_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT TERM INT

cd /app/ia_gefi
/opt/venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8001 &
PY_PID=$!

# Aguardamos o FastAPI inicializar antes de abrir a API pública.
ready=0
for n in $(seq 1 90); do
  if /opt/venv/bin/python -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8001/openapi.json", timeout=2)' >/dev/null 2>&1; then
    ready=1
    break
  fi
  if ! kill -0 "$PY_PID" 2>/dev/null; then
    echo 'FastAPI encerrou durante a inicialização.' >&2
    wait "$PY_PID" || true
    exit 1
  fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo 'FastAPI não respondeu em 90 segundos.' >&2
  exit 1
fi

echo 'FastAPI inicializado em localhost:8001'
cd /app/geAPI
node src/server.js &
NODE_PID=$!

# Encerrar o contêiner caso qualquer um dos serviços pare.
wait -n "$PY_PID" "$NODE_PID" || true
echo 'Um dos processos encerrou; reiniciando contêiner.' >&2
exit 1
