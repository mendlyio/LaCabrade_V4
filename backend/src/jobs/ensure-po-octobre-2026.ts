import type { MedusaContainer } from "@medusajs/framework/types"
import { ensurePortesOuvertesOctobre2026 } from "../scripts/seed-portes-ouvertes-octobre-2026"

/**
 * Filet de sécurité : crée la promo cavalier −20 % si le démarrage ne l'a pas fait.
 * Ne fait rien si elle existe déjà, ni après le 24 octobre 2026.
 */
export default async function ensurePoOctobreJob(container: MedusaContainer) {
  try {
    await ensurePortesOuvertesOctobre2026({ container } as any)
  } catch (error: any) {
    console.error(`[PO octobre] Job : ${error?.message || error}`)
  }
}

export const config = {
  name: "ensure-po-octobre-2026",
  schedule: "* * * * *",
}
