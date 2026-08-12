# server/Dockerfile
# Single image, used for BOTH the API and the BullMQ worker Dokploy apps —
# the worker app overrides the container's start command to `node workers/index.js`
# instead of building a second image (matches docker/12_DEPLOYMENT.md's split, without
# needing a separate Dockerfile.worker).
#
# NOTE: ZAP is NOT installed here. It runs as its own Dokploy app from the official
# ghcr.io/zaproxy/zaproxy image and is reached over HTTP via ZAP_API_URL.
#
# Debian slim (not alpine): Puppeteer's PDF report generation needs a real Chromium,
# which apt's `chromium` package provides with working glibc + font/codec libs.
# Alpine's musl libc breaks Puppeteer's bundled Chromium download, so we skip that
# download entirely and point Puppeteer at the apt-installed binary instead.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv \
      bash git wget unzip ca-certificates \
      chromium fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# SSLyze — isolated venv so pip doesn't fight Debian's "externally managed environment" guard.
RUN python3 -m venv /opt/sslyze-venv \
    && /opt/sslyze-venv/bin/pip install --no-cache-dir sslyze
ENV SSLYZE_PYTHON=/opt/sslyze-venv/bin/python3

# Nuclei — matches NUCLEI_BINARY_PATH default in server/.env.example
RUN wget -q https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64.zip -O /tmp/nuclei.zip \
    && unzip -q /tmp/nuclei.zip -d /usr/local/bin nuclei \
    && rm /tmp/nuclei.zip \
    && chmod +x /usr/local/bin/nuclei \
    && nuclei -update-templates -silent || true

# testssl.sh — matches TESTSSL_PATH default (./testssl.sh/testssl.sh) rebased to /opt
RUN git clone --depth 1 https://github.com/drwetter/testssl.sh /opt/testssl.sh
ENV TESTSSL_PATH=/opt/testssl.sh/testssl.sh

# Puppeteer: use the apt-installed Chromium instead of downloading its own copy.
# reportGenerator.js already launches with --no-sandbox --disable-setuid-sandbox
# (required to run Chromium as root in a container) and reads PUPPETEER_EXECUTABLE_PATH.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

# Default command runs the API. The worker Dokploy app overrides this
# (Custom Command: node workers/index.js) using the exact same image.
CMD ["node", "server.js"]
