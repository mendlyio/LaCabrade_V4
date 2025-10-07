#!/usr/bin/env tsx
import { Modules } from "@medusajs/framework/utils"
import { MedusaApp } from "@medusajs/framework"
import { ODOO_MODULE } from "../modules/odoo"
import { syncFromErpWorkflow } from "../workflows/sync-from-erp"

async function main() {
  const isDryRun = process.argv.includes("--dry")
  
  console.log(`🔄 Odoo Product Sync ${isDryRun ? "(DRY RUN)" : "(LIVE)"}\n`)
  
  // Check required ENV vars
  const required = ["ODOO_URL", "ODOO_DB_NAME", "ODOO_USERNAME", "ODOO_API_KEY"]
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:")
    missing.forEach(key => console.error(`   - ${key}`))
    console.error("\nPlease set these in your .env file\n")
    process.exit(1)
  }

  try {
    // Initialize Medusa app
    const { container } = await MedusaApp({
      modulesConfig: {
        [ODOO_MODULE]: {
          resolve: "./src/modules/odoo",
          options: {
            url: process.env.ODOO_URL!,
            dbName: process.env.ODOO_DB_NAME!,
            username: process.env.ODOO_USERNAME!,
            apiKey: process.env.ODOO_API_KEY!,
          },
        },
      },
    })

    const limit = 100
    let offset = 0
    let totalProducts = 0
    let totalToCreate = 0
    let totalToUpdate = 0
    
    console.log("Starting sync...\n")
    
    let hasMore = true
    while (hasMore) {
      const result = await syncFromErpWorkflow(container).run({
        input: {
          limit,
          offset,
          dryRun: isDryRun,
        },
      })
      
      const { productsProcessed, toCreate, toUpdate } = result.result
      
      totalProducts += productsProcessed
      totalToCreate += toCreate
      totalToUpdate += toUpdate
      
      if (productsProcessed < limit) {
        hasMore = false
      } else {
        offset += limit
      }
      
      console.log(`  Processed: ${productsProcessed} products (offset: ${offset})`)
    }
    
    console.log("\n✅ Sync completed!\n")
    console.log(JSON.stringify({
      mode: isDryRun ? "dry-run" : "live",
      totalProducts,
      toCreate: totalToCreate,
      toUpdate: totalToUpdate,
      unchanged: totalProducts - totalToCreate - totalToUpdate,
    }, null, 2))
    console.log()
    
    if (isDryRun) {
      console.log("ℹ️  This was a dry run. No changes were made.")
      console.log("   Run without --dry to apply changes.\n")
    }
    
    process.exit(0)
  } catch (error: any) {
    console.error("\n❌ Sync failed:\n")
    console.error(error.message)
    if (error.stack) {
      console.error("\nStack trace:")
      console.error(error.stack)
    }
    console.log()
    process.exit(1)
  }
}

main()

