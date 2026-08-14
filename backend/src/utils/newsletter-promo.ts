/**
 * Helpers partagés pour les codes promo newsletter (NL-) et anniversaire (ANNIV-).
 *
 * Important Medusa v2 : pour target_type "items", allocation "each" est requis
 * (comme les seeds soldes / PO / outlet). Sans allocation, la promo peut être
 * créée de façon incorrecte ou ne jamais s'appliquer au panier.
 */

import { Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generatePromoCode(prefix: string): string {
  let code = prefix + "-"
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

/** Payload Medusa pour -10% items, usage unique */
export function buildNewsletterPromotionPayload(code: string) {
  return {
    code,
    type: "standard" as const,
    status: "active" as const,
    is_automatic: false,
    usage_limit: 1,
    application_method: {
      type: "percentage" as const,
      target_type: "items" as const,
      allocation: "each" as const,
      value: 10,
      max_quantity: 100,
      apply_to_quantity: 1,
    },
  }
}

/**
 * Vérifie qu'une promo NL-/ANNIV- est utilisable (existe, active, items+each).
 * Si absente ou mal configurée : la recrée / corrige l'allocation.
 * Retourne le code final à utiliser (peut être inchangé).
 */
export async function ensureNewsletterPromotionUsable(
  container: any,
  code: string | null | undefined
): Promise<{ code: string; repaired: boolean; created: boolean }> {
  if (!code) {
    throw new Error("Code promo manquant")
  }

  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const [promo] = await promotionModule.listPromotions(
    { code },
    { take: 1 }
  )

  if (!promo) {
    const createPromotions = createPromotionsWorkflow(container)
    const result = await createPromotions.run({
      input: {
        promotionsData: [buildNewsletterPromotionPayload(code) as any],
      },
    })
    const id = result?.result?.[0]?.id
    if (!id) throw new Error(`Impossible de recréer la promo ${code}`)
    console.log(`[Newsletter] Promo manquante recréée: ${code} (${id})`)
    return { code, repaired: true, created: true }
  }

  let method: any = promo.application_method
  if (!method && promo.id) {
    try {
      const full = await promotionModule.retrievePromotion(promo.id, {
        relations: ["application_method"],
      })
      method = full?.application_method
    } catch {
      // ignore
    }
  }

  let repaired = false

  if (promo.status !== "active") {
    await promotionModule.updatePromotions([{ id: promo.id, status: "active" }])
    repaired = true
    console.log(`[Newsletter] Promo réactivée: ${code}`)
  }

  // Corriger allocation manquante via update si l'API le permet
  if (method?.target_type === "items" && !method?.allocation) {
    try {
      await promotionModule.updatePromotions([
        {
          id: promo.id,
          application_method: {
            id: method.id,
            allocation: "each",
            max_quantity: method.max_quantity ?? 100,
            apply_to_quantity: method.apply_to_quantity ?? 1,
          },
        },
      ])
      repaired = true
      console.log(`[Newsletter] Allocation each ajoutée sur ${code}`)
    } catch (e: any) {
      console.warn(
        `[Newsletter] update allocation échoué pour ${code}, régénération:`,
        e.message
      )
      // Fallback : nouveau code propre
      const newCode = generatePromoCode(code.startsWith("ANNIV") ? "ANNIV" : "NL")
      const createPromotions = createPromotionsWorkflow(container)
      const result = await createPromotions.run({
        input: {
          promotionsData: [buildNewsletterPromotionPayload(newCode) as any],
        },
      })
      if (!result?.result?.[0]?.id) {
        throw new Error(`Impossible de régénérer ${code}`)
      }
      try {
        await promotionModule.updatePromotions([
          { id: promo.id, status: "inactive" },
        ])
      } catch {
        // ignore
      }
      return { code: newCode, repaired: true, created: true }
    }
  }

  return { code, repaired, created: false }
}
