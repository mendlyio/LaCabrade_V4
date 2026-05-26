import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"
import { EmailTemplates } from "../modules/email-notifications/templates"

const STORE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.sellerie-lacabrade.be"

// Durée minimale d'inactivité avant d'envoyer (1h30)
const ABANDON_DELAY_MS = 90 * 60 * 1000

// Fenêtre max : ne pas relancer des paniers de + de 48h
const ABANDON_MAX_AGE_MS = 48 * 60 * 60 * 1000

/**
 * Job: send-cart-abandonment-emails
 * Lancé toutes les heures via medusa.config.ts (scheduleExpression: "0 * * * *")
 *
 * Testable manuellement via POST /admin/jobs/cart-abandonment-test
 */
export default async function sendCartAbandonmentEmails(container: MedusaContainer) {
  const isDryRun = process.env.CART_ABANDON_DRY_RUN === "true"
  const logger = (container as any).logger ?? console

  logger.info("[CartAbandonment] Démarrage du job...")

  const notificationService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)

  // Accès direct DB via le query-runner de Medusa (pgConnection)
  const pgConnection: any = (container as any).resolve?.("__pg_connection__") ??
    (container as any).__registrations__?.["__pg_connection__"]?.resolver?.(container)

  if (!pgConnection) {
    logger.warn("[CartAbandonment] Impossible de résoudre __pg_connection__, abandon.")
    return
  }

  const now = new Date()
  const minAge = new Date(now.getTime() - ABANDON_DELAY_MS)
  const maxAge = new Date(now.getTime() - ABANDON_MAX_AGE_MS)

  // On ne récupère que les paniers :
  // - avec email
  // - non convertis en commande
  // - mis à jour il y a > 1h30 et < 48h
  // - ayant au moins un article
  // - sans email d'abandon déjà envoyé
  const result = await pgConnection.raw(`
    SELECT
      c.id,
      c.email,
      c.updated_at,
      c.currency_code,
      c.metadata,
      json_agg(
        json_build_object(
          'title', li.title,
          'subtitle', li.subtitle,
          'thumbnail', li.thumbnail,
          'quantity', li.quantity,
          'unit_price', CAST(li.unit_price AS float),
          'product_handle', p.handle
        ) ORDER BY li.created_at
      ) as items
    FROM cart c
    JOIN cart_line_item li ON li.cart_id = c.id AND li.deleted_at IS NULL
    LEFT JOIN product p ON p.id = li.product_id AND p.deleted_at IS NULL
    WHERE c.email IS NOT NULL
      AND c.completed_at IS NULL
      AND c.deleted_at IS NULL
      AND c.updated_at < :minAge
      AND c.updated_at > :maxAge
      AND (c.metadata->>'abandon_email_sent_at') IS NULL
    GROUP BY c.id
    HAVING COUNT(li.id) > 0
  `, { minAge, maxAge })

  const carts = result?.rows ?? []
  logger.info(`[CartAbandonment] ${carts.length} panier(s) éligible(s) trouvé(s).`)

  if (carts.length === 0) return

  let sent = 0
  let errors = 0

  for (const cart of carts) {
    try {
      const items = cart.items || []
      const total = items.reduce((s: number, i: any) => s + (i.unit_price ?? 0) * (i.quantity ?? 1), 0)
      const cartUrl = `${STORE_URL}/be/cart`

      if (isDryRun) {
        logger.info(`[CartAbandonment] DRY RUN — would send to: ${cart.email} (${items.length} items, ${total.toFixed(2)} €)`)
      } else {
        await notificationService.createNotifications({
          to: cart.email,
          channel: "email",
          template: EmailTemplates.CART_ABANDONED,
          data: {
            email: cart.email,
            items,
            cartUrl,
            totalAmount: total,
            currencyCode: cart.currency_code ?? "eur",
          },
        })

        // Marquer le panier pour ne pas renvoyer
        await pgConnection.raw(
          `UPDATE cart SET metadata = COALESCE(metadata, '{}') || :patch WHERE id = :id`,
          {
            patch: JSON.stringify({ abandon_email_sent_at: now.toISOString() }),
            id: cart.id,
          }
        )

        sent++
        logger.info(`[CartAbandonment] Email envoyé à ${cart.email} (cart ${cart.id})`)
      }
    } catch (err: any) {
      errors++
      logger.error(`[CartAbandonment] Erreur pour cart ${cart.id}: ${err?.message}`)
    }
  }

  logger.info(`[CartAbandonment] Terminé — ${sent} envoyé(s), ${errors} erreur(s).`)
}

export const config = {
  name: "send-cart-abandonment-emails",
  schedule: "0 * * * *", // toutes les heures
}
