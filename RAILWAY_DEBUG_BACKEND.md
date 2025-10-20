# 🔧 Guide de Debug Backend sur Railway

## Problème actuel : ECONNRESET PostgreSQL

Les erreurs `ECONNRESET` indiquent que la connexion à PostgreSQL est interrompue brutalement. Voici comment diagnostiquer et résoudre :

---

## ✅ Checklist de vérification

### 1. **PostgreSQL est-il bien déployé ?**

Dans Railway :
- Allez dans votre projet
- Vérifiez qu'un service **PostgreSQL** existe
- Vérifiez qu'il est en état **"Active"** (pas "Crashed" ou "Deploying")

### 2. **DATABASE_URL est-elle configurée ?**

Dans les variables d'environnement du **service Backend** :
```bash
# Doit être présent et pointer vers le service PostgreSQL
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

⚠️ **Important** : Utilisez la référence `${{Postgres.DATABASE_URL}}` et non une URL en dur !

### 3. **Les services peuvent-ils communiquer ?**

Sur Railway, les services doivent être dans le **même projet** pour communiquer via le réseau privé.

Vérifiez :
- Backend et PostgreSQL sont dans le même projet Railway
- Pas de restriction réseau particulière

### 4. **Ordre de démarrage**

Sur Railway, le backend peut démarrer **avant** que PostgreSQL soit prêt. C'est exactement ce que notre script `start-server.js` gère !

Le script va :
1. ✅ Attendre 10 secondes
2. ✅ Essayer de se connecter 15 fois
3. ✅ Attendre 5 secondes entre chaque tentative
4. ✅ Afficher des logs détaillés

---

## 🔍 Comment vérifier les logs

### Dans Railway :

1. Cliquez sur votre service **Backend**
2. Allez dans l'onglet **"Deployments"**
3. Cliquez sur le dernier déploiement
4. Consultez les **logs en temps réel**

### Ce que vous devriez voir :

#### ✅ **Logs de succès** (si tout fonctionne) :
```
🚀 Starting Medusa backend with retry mechanism...
   Node version: v22.x.x
✅ Environment variables validated
⏳ Waiting 10s for PostgreSQL to start...
⏳ Attempting to connect to PostgreSQL (attempt 1/15)...
   ✓ Connected to PostgreSQL
   ✓ Query test successful
✅ PostgreSQL is ready!
🔧 Initializing backend (migrations, seeds, admin)...
✅ Command completed successfully
🚀 Starting Medusa server...
```

#### ⚠️ **Logs d'erreur** (si ça ne fonctionne pas) :
```
⚠️  PostgreSQL not ready: ECONNRESET
   Error details: -104, read
⏳ Waiting 5s before retry...
```

---

## 🛠️ Solutions selon le problème

### Problème 1 : "Missing required environment variables"

**Solution** : Ajoutez les variables manquantes dans Railway

Variables **OBLIGATOIRES** :
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<générer-secret-32-chars>
COOKIE_SECRET=<générer-secret-32-chars>
```

Générer les secrets :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Problème 2 : "Failed to connect to PostgreSQL after 15 attempts"

**Causes possibles** :

1. **PostgreSQL n'est pas démarré**
   - ✅ Vérifiez que le service PostgreSQL est "Active"
   - ✅ Redémarrez le service PostgreSQL si nécessaire

2. **DATABASE_URL incorrecte**
   - ✅ Vérifiez qu'elle utilise `${{Postgres.DATABASE_URL}}`
   - ✅ Ne mettez PAS une URL en dur

3. **Réseau Railway**
   - ✅ Les deux services doivent être dans le même projet
   - ✅ Attendez 2-3 minutes après avoir créé PostgreSQL

4. **Limites Railway**
   - ✅ Vérifiez que vous n'avez pas dépassé les limites de votre plan
   - ✅ Vérifiez l'état général de Railway (status.railway.app)

### Problème 3 : "Backend initialization failed"

Cela arrive **après** que PostgreSQL soit connecté.

**Causes possibles** :

1. **Migrations en conflit**
   ```bash
   # Solution : Réinitialiser la base de données
   # Dans Railway, supprimez et recréez le service PostgreSQL
   # ⚠️ Attention : Cela efface toutes les données !
   ```

2. **Permissions insuffisantes**
   ```bash
   # Vérifiez que l'utilisateur PostgreSQL a les permissions CREATE, ALTER, etc.
   ```

---

## 🚀 Procédure de déploiement complète

### Étape 1 : Créer PostgreSQL

1. Dans Railway, cliquez sur **"+ New"**
2. Sélectionnez **"Database"** → **"PostgreSQL"**
3. Attendez que le statut soit **"Active"** (1-2 minutes)

### Étape 2 : Configurer les variables Backend

Dans le service **Backend**, ajoutez :
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<votre-secret-jwt>
COOKIE_SECRET=<votre-secret-cookie>
BACKEND_PUBLIC_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
STORE_CORS=https://votre-frontend.up.railway.app
ADMIN_CORS=https://${{RAILWAY_PUBLIC_DOMAIN}}
MEDUSA_WORKER_MODE=shared
NODE_ENV=production
```

### Étape 3 : Redéployer le Backend

1. Cliquez sur **"Deploy"** ou attendez le déploiement automatique
2. Surveillez les logs en temps réel
3. Le démarrage peut prendre **2-3 minutes** (attente + migrations)

### Étape 4 : Vérifier que ça fonctionne

```bash
# Healthcheck
curl https://votre-backend.up.railway.app/health

# Devrait retourner : {"status":"ok"}
```

---

## 📊 Temps de démarrage normal

| Étape | Temps estimé |
|-------|--------------|
| PostgreSQL ready | 10-20 secondes |
| Connexion réussie | 1-2 secondes |
| init-backend (migrations) | 30-60 secondes |
| Démarrage serveur | 10-20 secondes |
| **TOTAL** | **~2-3 minutes** |

---

## 🆘 Si rien ne fonctionne

### Option 1 : Recommencer from scratch

1. **Supprimer** le service PostgreSQL
2. **Supprimer** et **recréer** le service Backend
3. **Créer** un nouveau PostgreSQL
4. **Configurer** toutes les variables
5. **Déployer**

### Option 2 : Contacter le support

Si après tout ça le backend ne démarre toujours pas :

1. Copiez les **logs complets** du déploiement
2. Vérifiez que :
   - ✅ PostgreSQL est "Active"
   - ✅ DATABASE_URL est définie avec `${{Postgres.DATABASE_URL}}`
   - ✅ JWT_SECRET et COOKIE_SECRET sont définis
3. Vérifiez status.railway.app pour des incidents

---

## 💡 Astuces

### Voir les connexions PostgreSQL actives

Dans le terminal Railway du service PostgreSQL :
```bash
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"
```

### Forcer un redéploiement

1. Allez dans **"Deployments"**
2. Cliquez sur **"Redeploy"** sur le dernier déploiement

### Tester localement

Pour reproduire le problème en local :
```bash
cd backend
export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
export JWT_SECRET="test-secret"
export COOKIE_SECRET="test-cookie"
node start-server.js
```

---

## ✅ Checklist finale avant de demander de l'aide

- [ ] Service PostgreSQL existe et est "Active"
- [ ] DATABASE_URL = `${{Postgres.DATABASE_URL}}`
- [ ] JWT_SECRET et COOKIE_SECRET sont définis
- [ ] Les deux services sont dans le même projet
- [ ] J'ai attendu au moins 3 minutes après le déploiement
- [ ] J'ai consulté les logs complets
- [ ] J'ai vérifié status.railway.app
- [ ] J'ai essayé de redéployer

