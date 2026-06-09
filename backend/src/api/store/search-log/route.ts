import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * POST /store/search-log
 *
 * Enregistre une recherche intentionnelle du visiteur (best-effort) pour
 * analyser la demande réelle et repérer les recherches sans résultat.
 * La table est créée à la volée (idempotent) afin d'éviter une migration.
 *
 * Body: { query: string, results_count?: number|null, country?: string }
 */
let tableReady = false

function normalize(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as any
    const query = (body?.query || "").toString().trim().slice(0, 200)
    if (!query || query.length < 2) {
      return res.json({ success: false })
    }
    const resultsCount =
      body?.results_count === null || body?.results_count === undefined
        ? null
        : Number(body.results_count)
    const country = (body?.country || "").toString().slice(0, 8) || null

    const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    if (!tableReady) {
      await knex.raw(`
        CREATE TABLE IF NOT EXISTS search_log (
          id bigserial PRIMARY KEY,
          query text NOT NULL,
          normalized_query text,
          results_count integer,
          country text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `)
      await knex.raw(
        `CREATE INDEX IF NOT EXISTS idx_search_log_norm ON search_log (normalized_query)`
      )
      await knex.raw(
        `CREATE INDEX IF NOT EXISTS idx_search_log_created ON search_log (created_at)`
      )
      tableReady = true
    }

    await knex.raw(
      `INSERT INTO search_log (query, normalized_query, results_count, country)
       VALUES (?, ?, ?, ?)`,
      [query, normalize(query), Number.isFinite(resultsCount as number) ? resultsCount : null, country]
    )

    return res.json({ success: true })
  } catch (error: any) {
    // Non bloquant : on ne casse jamais l'expérience de recherche
    console.error("[search-log] Erreur:", error?.message)
    return res.json({ success: false })
  }
}
