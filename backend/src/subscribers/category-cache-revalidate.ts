/**
 * Invalide le cache Next.js des catégories quand une catégorie est créée ou mise à jour.
 *
 * Le storefront utilise `unstable_cache` avec le tag "categories" et un TTL de 1h.
 * Sans ce subscriber, une nouvelle catégorie créée dans l'admin n'apparaît sur le site
 * qu'après expiration du cache (jusqu'à 1h de délai).
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function categoryCacheRevalidateHandler({
  event: { data },
}: SubscriberArgs<{ id: string }>) {
  const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL
  const revalidateSecret = process.env.REVALIDATE_SECRET

  if (!storefrontUrl || !revalidateSecret) {
    console.warn(
      "[category-cache-revalidate] NEXT_PUBLIC_BASE_URL ou REVALIDATE_SECRET manquant — revalidation ignorée"
    )
    return
  }

  try {
    const url = `${storefrontUrl}/api/revalidate`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: revalidateSecret, tags: ["categories"] }),
    })

    if (res.ok) {
      console.log(
        `[category-cache-revalidate] Cache "categories" invalidé (catégorie ${data.id})`
      )
    } else {
      console.warn(
        `[category-cache-revalidate] Réponse inattendue: ${res.status}`
      )
    }
  } catch (err: any) {
    console.warn(
      "[category-cache-revalidate] Erreur lors de la revalidation:",
      err?.message
    )
  }
}

export const config: SubscriberConfig = {
  event: ["product_category.created", "product_category.updated"],
}
