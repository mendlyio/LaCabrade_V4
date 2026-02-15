import OdooModuleService from "../modules/odoo/service"

interface GiftCardOdooData {
  code: string
  amount: number // en euros
  medusaOrderId: string
}

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 1000

/**
 * Synchronise un bon cadeau vers Odoo en créant un produit de type "service".
 * Utilise un retry avec backoff exponentiel en cas d'échec.
 *
 * Le service Odoo utilise un JSONRPCClient interne.
 * On passe par les propriétés du service (options, uid, client) pour faire l'appel.
 *
 * @param odooService - Instance du service Odoo (doit être connecté via login())
 * @param data - Données du bon cadeau
 */
export async function syncGiftCardToOdoo(
  odooService: OdooModuleService,
  data: GiftCardOdooData
): Promise<number | null> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Connexion Odoo si nécessaire
      await odooService.login()

      // Accéder au client et aux infos de connexion via les propriétés internes
      // Note: On utilise 'as any' car ces propriétés sont privées dans le service
      const service = odooService as any
      const client = service.client
      const dbName = service.options.dbName
      const uid = service.uid
      const apiKey = service.options.apiKey

      // Créer le produit gift card dans Odoo via JSON-RPC
      const odooProductId: number = await client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          dbName,
          uid,
          apiKey,
          "product.product",
          "create",
          [
            {
              name: `Bon Cadeau ${data.code}`,
              default_code: data.code, // SKU = code gift card
              list_price: data.amount,
              type: "service",
              sale_ok: false, // Non vendable directement dans Odoo
              purchase_ok: false,
              active: true,
              description_sale: `Bon cadeau La Cabrade - ${data.amount}€ - Commande Medusa: ${data.medusaOrderId}`,
            },
          ],
        ],
      })

      console.log(
        `[GiftCard→Odoo] ✅ Bon cadeau ${data.code} synchronisé (Odoo ID: ${odooProductId})`
      )

      return odooProductId
    } catch (error: any) {
      lastError = error
      console.warn(
        `[GiftCard→Odoo] ⚠️ Tentative ${attempt}/${MAX_RETRIES} échouée: ${error.message}`
      )

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1)
        console.log(`[GiftCard→Odoo] ⏳ Nouvelle tentative dans ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  console.error(
    `[GiftCard→Odoo] ❌ Échec après ${MAX_RETRIES} tentatives pour ${data.code}:`,
    lastError?.message
  )

  // On retourne null sans throw pour ne pas bloquer le flow principal
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
