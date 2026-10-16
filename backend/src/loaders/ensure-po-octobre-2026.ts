import type { LoaderOptions } from "@medusajs/framework/types"
import { ensurePortesOuvertesOctobre2026 } from "../scripts/seed-portes-ouvertes-octobre-2026"

/**
 * Active PO_OCT_CAVALIER_20 au démarrage du backend.
 * Une erreur ici ne doit pas empêcher le serveur de démarrer :
 * le job ensure-po-octobre-2026 réessaie chaque minute.
 */
export default async function ensurePoOctobreLoader({ container }: LoaderOptions) {
  try {
    await ensurePortesOuvertesOctobre2026({ container } as any)
  } catch (error: any) {
    console.error(
      `[PO octobre] Activation au démarrage reportée : ${error?.message || error}`
    )
  }
}
