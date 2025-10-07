#!/usr/bin/env tsx
import { Modules } from "@medusajs/framework/utils"
import { MedusaApp } from "@medusajs/framework"
import { ODOO_MODULE } from "../modules/odoo"
import OdooModuleService from "../modules/odoo/service"

async function main() {
  console.log("🔌 Odoo Connection Test\n")
  
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
    // Initialize Medusa app to get DI container
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

    // Resolve Odoo service
    const odooService: OdooModuleService = container.resolve(ODOO_MODULE)
    
    // Test connection
    console.log("Connecting to Odoo...")
    const result = await odooService.ping()
    
    console.log("\n✅ Connection successful!\n")
    console.log(JSON.stringify(result, null, 2))
    console.log()
    
    process.exit(0)
  } catch (error: any) {
    console.error("\n❌ Connection failed:\n")
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

