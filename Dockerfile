FROM node:22-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    NODE_ENV=production \
    PORT=10000 \
    ML_BASE_URL=http://127.0.0.1:8001

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv python3-pip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY ia_gefi/requirements.txt /app/ia_gefi/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r /app/ia_gefi/requirements.txt

COPY geAPI/package.json /app/geAPI/package.json
WORKDIR /app/geAPI
RUN npm install --omit=dev --package-lock=false --no-audit --no-fund

WORKDIR /app
COPY geAPI /app/geAPI
COPY ia_gefi /app/ia_gefi
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 10000
CMD ["/bin/bash", "/app/start.sh"]
