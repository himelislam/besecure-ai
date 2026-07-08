# Deployment Guide

## Recommended Stack for Production

| Service | Recommended Provider | Why | Monthly Cost (approx.) |
|---|---|---|---|
| API Server | Railway or Render | Easy deploys from GitHub, env var management | $5–10 |
| Worker Process | Railway or Render | Separate service for BullMQ worker | $5–10 |
| MongoDB | MongoDB Atlas (M0 free → M2 $9/mo) | Managed, backups, easy IP whitelist | $0–9 |
| Redis | Upstash (free 10k req/day → $10/mo) | Serverless Redis, per-request pricing | $0–10 |
| ZAP Scanner | VPS (DigitalOcean $6/mo droplet) | Needs persistent Docker container | $6 |
| Frontend | Vercel or Netlify (free tier) | Static React build, CDN | $0 |
| Email | Resend (free 3000/mo) | Simple API, good deliverability | $0 |
| File Storage | Cloudinary (free 25GB) | PDFs + avatars | $0 |
| Payments | Stripe | Industry standard | 2.9% + $0.30/transaction |

**Estimated MVP monthly cost: ~$25–50** depending on usage

---

## Option A — Railway (Recommended for Speed)

Railway deploys directly from GitHub and handles most infrastructure automatically.

### Step 1 — Set Up GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create your-security-platform --private
git push -u origin main
```

### Step 2 — Deploy API Server on Railway
1. Go to railway.app → New Project → Deploy from GitHub
2. Select your repository
3. Railway auto-detects Node.js
4. Set root directory to `/server`
5. Set start command: `node server.js`
6. Add all environment variables from `08_ENV_AND_SECRETS.md`
7. Set `NODE_ENV=production`

### Step 3 — Deploy Worker Process on Railway
1. In the same Railway project → Add Service → GitHub Repo (same repo)
2. Set root directory to `/server`
3. Set start command: `node workers/index.js` (the worker entry point)
4. Add same environment variables as API server
5. This process only runs BullMQ worker — no HTTP server

### Step 4 — MongoDB Atlas
1. cloud.mongodb.com → Create Free Cluster (M0)
2. Database Access → Add user with read/write permissions
3. Network Access → Add IP: `0.0.0.0/0` (allow all — Railway IPs are dynamic)
4. Connect → Copy connection string → set as `MONGODB_URI`

### Step 5 — Upstash Redis
1. console.upstash.com → Create Database → Region closest to Railway deployment
2. Copy Redis URL → set as `REDIS_URL`

### Step 6 — Deploy Frontend on Vercel
1. vercel.com → New Project → Import from GitHub
2. Set root directory to `/client`
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables:
   - `VITE_API_URL=https://your-api-railway-url.railway.app/api`
   - `VITE_SOCKET_URL=https://your-api-railway-url.railway.app`
   - `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`

### Step 7 — ZAP Scanner (Deep Scans Only)
ZAP needs a persistent container. Use a small VPS:

```bash
# On DigitalOcean $6 droplet or similar:
docker run -d \
  --name zap \
  --restart unless-stopped \
  -p 8090:8080 \
  ghcr.io/zaproxy/zaproxy:stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true
```

Set `ZAP_API_URL=http://your-vps-ip:8090` in your Railway env vars.

**Security note:** The ZAP port should NOT be open to the public internet. Use a firewall to restrict port 8090 to only your Railway/Render server IPs.

---

## Option B — Render

Very similar to Railway. Key differences:

- API server: New Web Service → Connect GitHub → Root: `/server` → Start: `node server.js`
- Worker: New Background Worker → Same repo → Root: `/server` → Start: `node workers/index.js`
- Render free tier spins down after inactivity — use paid ($7/mo) for always-on

---

## Production Dockerfile (if using VPS or container deployment)

### API Server Dockerfile
```dockerfile
# /server/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install Python for SSLyze subprocess calls
RUN apk add --no-cache python3 py3-pip bash

# Install SSLyze
RUN pip3 install sslyze --break-system-packages

# Install Nuclei
RUN wget -q https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64.zip \
    && unzip nuclei_linux_amd64.zip \
    && mv nuclei /usr/local/bin/ \
    && rm nuclei_linux_amd64.zip \
    && nuclei -update-templates -silent

# Install testssl.sh
RUN git clone --depth 1 https://github.com/drwetter/testssl.sh /opt/testssl.sh

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### Worker Dockerfile
```dockerfile
# /server/Dockerfile.worker
FROM node:20-alpine

WORKDIR /app

# Same scanner tools as API Dockerfile above
RUN apk add --no-cache python3 py3-pip bash git wget
RUN pip3 install sslyze --break-system-packages
RUN wget -q https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64.zip \
    && unzip nuclei_linux_amd64.zip && mv nuclei /usr/local/bin/ && rm nuclei_linux_amd64.zip
RUN nuclei -update-templates -silent
RUN git clone --depth 1 https://github.com/drwetter/testssl.sh /opt/testssl.sh

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "workers/index.js"]
```

### Production docker-compose.yml (Full Stack)
```yaml
version: '3.8'

services:
  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
    env_file:
      - ./server/.env
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    networks:
      - app-network

  worker:
    build:
      context: ./server
      dockerfile: Dockerfile.worker
    environment:
      NODE_ENV: production
    env_file:
      - ./server/.env
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    networks:
      - app-network

  mongodb:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    restart: unless-stopped
    networks:
      - app-network
    # DO NOT expose port 27017 in production

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - app-network

  zap:
    image: ghcr.io/zaproxy/zaproxy:stable
    command: zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true
    restart: unless-stopped
    networks:
      - app-network
    # DO NOT expose port 8080 externally

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./client/dist:/usr/share/nginx/html
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - app-network

volumes:
  mongo-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

---

## Nginx Configuration

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Serve frontend (React build)
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html; # SPA routing
    }

    # Proxy API to Node.js
    location /api {
        proxy_pass http://api:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket for Socket.io
    location /socket.io {
        proxy_pass http://api:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Stripe webhook (raw body needed)
    location /webhooks {
        proxy_pass http://api:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## SSL Certificate (Let's Encrypt)

```bash
# On your VPS with Certbot:
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
# Auto-renewal is set up automatically
```

---

## CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm i -g @railway/cli

      - name: Deploy API
        run: railway up --service api-server
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy Worker
        run: railway up --service scan-worker
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Pre-Deployment Checklist

### Security
- [ ] All secrets in provider's secret manager (not in code)
- [ ] `NODE_ENV=production` set
- [ ] HTTPS enforced (SSL certificate configured)
- [ ] MongoDB only accepts connections from server IP(s)
- [ ] Redis has auth password set
- [ ] ZAP port not publicly accessible
- [ ] CORS set to exact frontend domain only
- [ ] Stripe using live keys (`sk_live_`, `pk_live_`)
- [ ] Rate limiting tested

### Functionality
- [ ] Database connection tested from production
- [ ] Email sending tested (verify email flow)
- [ ] Stripe webhook tested (`stripe listen --forward-to` in CLI)
- [ ] At least one baseline scan completed successfully
- [ ] Socket.io events received by frontend
- [ ] PDF generation working
- [ ] Cloudinary uploads working

### Performance
- [ ] MongoDB indexes created (run `db.collection.createIndex()` or Mongoose auto-creates on connect)
- [ ] Redis connection pooling configured
- [ ] Puppeteer memory limits set for PDF generation
- [ ] BullMQ concurrency limited (don't run 10 scans simultaneously on small server)
  ```javascript
  const worker = new Worker('scan-queue', processor, {
    connection: redisConnection,
    concurrency: 2  // Max 2 scans at once per worker instance
  });
  ```

### Monitoring
- [ ] Winston logs going to provider's log viewer
- [ ] Set up uptime monitor (UptimeRobot free tier — monitors `/api/health`)
- [ ] BullMQ Bull Board set up at `/admin/queues` (protect with basic auth)

---

## Post-Deployment: Run Platform Against Itself

Once deployed, do this immediately:
1. Add your own platform's domain as a website
2. Run a baseline scan
3. Fix any findings
4. Your platform should score A or better on its own scanner

This is both a quality check and great for marketing ("We eat our own dog food").
