#!/usr/bin/env tsx
/**
 * Script de synchronisation Odoo → Medusa
 * 
 * IMPORTANT: Ce script nécessite un environnement Medusa complet.
 * Pour l'instant, utilisez le job cron qui s'exécute automatiquement,
 * ou déclenchez la sync via l'API admin.
 * 
 * Usage (si environnement configuré):
 *   tsx src/scripts/odoo-sync.ts --dry   # Dry run
 *   tsx src/scripts/odoo-sync.ts          # Live sync
 */

console.log(`
⚠️  Ce script nécessite l'environnement Medusa complet.

Alternatives recommandées:
1. Le job cron s'exécute automatiquement quotidiennement
2. Utilisez l'API admin: POST /admin/odoo/sync
3. Déclenchez via le widget admin (page Products)

Fichier du job: src/jobs/odoo-sync-products.ts
`)

process.exit(0)

