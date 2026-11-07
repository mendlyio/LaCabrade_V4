import type { MedusaContainer } from "@medusajs/framework/types"
import { ensureFermetureNovembre2026 } from "../scripts/seed-fermeture-novembre-2026"

/**
 * Filet de sécurité : crée la promo −10 % si le démarrage ne l'a pas fait.
 * Ne fait rien si elle existe déjà, ni après le 11 novembre 2026.
 */
export default async function ensureFermetureNovembreJob(container: MedusaContainer) {
  try {
    await ensureFermetureNovembre2026({ container } as any)
  } catch (error: any) {
    console.error(`[Fermeture novembre] Job : ${error?.message || error}`)
  }
}

export const config = {
  name: "ensure-fermeture-novembre-2026",
  schedule: "* * * * *",
}
