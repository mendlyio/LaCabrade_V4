import type { LoaderOptions } from "@medusajs/framework/types"
import { ensureFermetureNovembre2026 } from "../scripts/seed-fermeture-novembre-2026"

/**
 * Crée FERMETURE_NOV_10 au démarrage du backend.
 * Une erreur ici ne doit pas empêcher le serveur de démarrer :
 * le job ensure-fermeture-novembre-2026 réessaie chaque minute.
 */
export default async function ensureFermetureNovembreLoader({ container }: LoaderOptions) {
  try {
    await ensureFermetureNovembre2026({ container } as any)
  } catch (error: any) {
    console.error(
      `[Fermeture novembre] Activation au démarrage reportée : ${error?.message || error}`
    )
  }
}
