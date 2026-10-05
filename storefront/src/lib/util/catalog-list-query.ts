/**
 * Pages catégorie / marque : on relit tout le catalogue puis on filtre.
 * Laisser `category_id` dans getProductsList crée une clé cache par
 * catégorie → un crawl /categories/* relance N scans (Killed storefront
 * 30/09 04:09, RAM 1,99/2 Go). Le filtrage catégorie / marque après coup
 * reste inchangé.
 */
export function catalogListQuery<T extends Record<string, unknown>>(
  queryParams: T
): Omit<T, "category_id"> {
  const { category_id: _categoryId, ...rest } = queryParams
  return rest
}

/** Taille des lots catalogue (inchangée : 100). */
export const CATALOG_ASSEMBLY_BATCH = 100

/**
 * Même catalogue pour toutes les pages catégorie / marque d'une région,
 * quelle que soit la page ou le category_id. Le crawl /fr/categories +
 * /fr/marques du 04/10 01:26 relançait N assemblages en parallèle
 * (lots déjà en cache, mais N copies en RAM → Killed).
 */
export function catalogAssemblyQuery<T extends Record<string, unknown>>(
  queryParams: T
): Omit<T, "category_id"> & { limit: number; offset: number } {
  return {
    ...catalogListQuery(queryParams),
    limit: CATALOG_ASSEMBLY_BATCH,
    offset: 0,
  }
}
