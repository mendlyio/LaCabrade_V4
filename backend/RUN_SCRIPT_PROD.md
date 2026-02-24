# Exécuter un script depuis ton ordi vers la prod

Pour lancer `pnpm run delete:medusa-demo` (ou autre script) **depuis ton Mac** en ciblant la **base Railway**, ton `.env` doit contenir les **vraies URLs**, pas les variables Railway.

## Problème

Si ton `.env` contient :
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

Ces valeurs ne sont pas résolues en local → erreur `getaddrinfo ENOTFOUND`.

## Solution

### 1. Récupérer les URLs dans Railway

1. Ouvre ton projet sur [railway.app](https://railway.app)
2. Onglet **Variables** du service **Backend**
3. Copie les valeurs réelles de `DATABASE_URL` et `REDIS_URL`

Elles ressemblent à :
- `DATABASE_URL` : `postgresql://postgres:xxx@xxx.proxy.rlwy.net:xxxxx/railway`
- `REDIS_URL` : `redis://default:xxx@xxx.proxy.rlwy.net:xxxxx`

### 2. Créer un `.env.prod` temporaire

```bash
cd backend
cp .env .env.backup
# Édite .env et remplace DATABASE_URL et REDIS_URL par les vraies URLs
```

Ou lance le script en surchargeant les variables :

```bash
cd backend
DATABASE_URL="postgresql://postgres:TON_MOT_DE_PASSE@shuttle.proxy.rlwy.net:52325/railway" \
REDIS_URL="redis://default:TON_MOT_DE_PASSE@shortline.proxy.rlwy.net:29025" \
pnpm run delete:medusa-demo
```

(Remplace par tes vraies valeurs depuis Railway.)

### 3. Après le script

Remets ton `.env` d’origine si tu utilises les variables Railway pour le déploiement.
