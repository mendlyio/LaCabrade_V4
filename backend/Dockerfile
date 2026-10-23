# Reproduit backend/nixpacks.toml.
# Nixpacks installe l'attribut nixpkgs nodejs_22 (NixOS). La famille glibc
# équivalente demandée est Debian bookworm, avec le patch Node exact.
FROM node:22.23.4-bookworm-slim

WORKDIR /app

# [variables] de nixpacks.toml. NIXPACKS est posé par le builder Nixpacks
# et lu par src/scripts/postBuild.js (copie de node_modules, pas un symlink).
ENV NPM_CONFIG_LOGLEVEL=error \
    NODE_OPTIONS=--max-old-space-size=4096 \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    FORCE_COPY_NODE_MODULES=1 \
    NIXPACKS=1

# constants.js refuse le build sans ces trois variables. Railway les passe
# en build-args lorsque l'ARG est déclaré. Elles ne sont pas recopiées en
# ENV : le runtime les reçoit de Railway, et aucune valeur n'est dans le dépôt.
ARG DATABASE_URL
ARG JWT_SECRET
ARG COOKIE_SECRET

COPY . .

# [phases.install]
RUN npm ci --prefer-offline --no-audit || npm install --no-audit

# [phases.build]
RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build

# [start] — le processus lit PORT (Railway) comme aujourd'hui.
CMD ["node", "start-server.js"]
