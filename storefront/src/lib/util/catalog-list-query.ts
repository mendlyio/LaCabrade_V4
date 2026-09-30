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
