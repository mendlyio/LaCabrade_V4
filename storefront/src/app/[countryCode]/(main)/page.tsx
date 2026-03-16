import { Metadata } from "next"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { buildCategoryTree } from "@lib/util/category-tree"
import { slugify } from "@lib/util/slugify"
import HomeContent from "@modules/home/components/home-content"
import ProductCardModern from "@modules/products/components/product-card-modern"

const HOME_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"

export const metadata: Metadata = {
  title: "La Cabrade - Sellerie Équestre | LC•EQUESTRIAN",
  description:
    "Vivez l'équitation comme vous l'aimez, sans compromis. Des prix justes, du matériel fiable, et toute l'émotion d'une sellerie pensée pour les passionnés.",
  alternates: {
    canonical: `${HOME_BASE_URL}/be`,
    languages: {
      "fr-BE": `${HOME_BASE_URL}/be`,
      "nl-BE": `${HOME_BASE_URL}/be`,
      "x-default": `${HOME_BASE_URL}/be`,
    },
  },
}

export const revalidate = 60

/** IDs de la catégorie + tous ses descendants */
function getCategoryAndDescendantIds(categoryId: string, categoryMap: Map<string, any>): Set<string> {
  const ids = new Set<string>([categoryId])
  const stack = [categoryId]
  while (stack.length) {
    const id = stack.pop()!
    const node = categoryMap.get(id)
    node?.category_children?.forEach((child: any) => {
      if (child?.id) {
        ids.add(child.id)
        stack.push(child.id)
      }
    })
  }
  return ids
}

const categoryImages: Record<string, string> = {
  cheval: "https://ik.imagekit.io/kodt9cn6f/cheval.webp",
  cavalier: "https://ik.imagekit.io/kodt9cn6f/Cabrade/cavalier.webp",
  "soin-et-alimentation": "https://ik.imagekit.io/kodt9cn6f/soins.webp",
  "soins-et-alimentation": "https://ik.imagekit.io/kodt9cn6f/soins.webp",
  "son-et-alimentation": "https://ik.imagekit.io/kodt9cn6f/soins.webp",
  ecurie: "https://ik.imagekit.io/kodt9cn6f/ecurie.webp",
  outlet: "https://ik.imagekit.io/kodt9cn6f/Cabrade/outlet.webp",
  "lc-equestrian": "https://ik.imagekit.io/kodt9cn6f/Cabrade/Lc-equestrian.webp",
  "la-cabrade": "https://ik.imagekit.io/kodt9cn6f/Cabrade/Lc-equestrian.webp",
}

function getCategoryImage(category: any): string {
  const handleKey = category?.handle ? slugify(category.handle) : ""
  const nameKey = category?.name ? slugify(category.name) : ""
  return categoryImages[handleKey] || categoryImages[nameKey] || ""
}

export default async function Home({
  params: { countryCode },
}: {
  params: { countryCode: string }
}) {
  const [region, allCategories] = await Promise.all([
    getRegion(countryCode),
    listCategories().catch((error) => {
      console.error("Erreur lors de la récupération des catégories:", error)
      return [] as any[]
    }),
  ])

  if (!region) {
    return null
  }

  const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]
  const lcCategory = allCategories.find((c: any) =>
    LC_EQUESTRIAN_HANDLES.includes((c.handle || "").toLowerCase())
  )

  const { map: categoryMap } = buildCategoryTree(allCategories)

  const lcProductsPromise = lcCategory
    ? getProductsList({
        queryParams: {
          limit: 48,
          region_id: region.id,
          category_id: [lcCategory.id],
          fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+images,+categories.handle,+categories.id",
        } as any,
        countryCode,
      }).catch((error) => {
        console.error("Erreur lors de la récupération des produits LC Equestrian:", error)
        return { response: { products: [] as any[], count: 0 } }
      })
    : Promise.resolve({ response: { products: [] as any[], count: 0 } })

  const newProductsPromise = getProductsList({
    queryParams: {
      limit: 8,
      region_id: region.id,
      order: "-created_at",
      fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+images,+categories.handle,+categories.id",
    } as any,
    countryCode,
  }).catch((error) => {
    console.error("Erreur lors de la récupération des nouveautés:", error)
    return { response: { products: [] as any[], count: 0 } }
  })

  const [lcResult, newResult] = await Promise.all([
    lcProductsPromise,
    newProductsPromise,
  ])

  let lcEquestrianProducts: any[] = []
  if (lcCategory) {
    const allowedIds = getCategoryAndDescendantIds(lcCategory.id, categoryMap)
    const raw = lcResult.response.products || []
    const isInLcCategory = (p: any) =>
      (p.categories || []).some((cat: any) => cat?.id && allowedIds.has(cat.id))
    lcEquestrianProducts = raw.filter(isInLcCategory).slice(0, 8)
  }

  const newProducts = newResult.response.products || []

  const parentCategories = allCategories.filter(
    (c: any) => c.parent_category_id == null && c.is_active !== false
  )
  const sorted = [...parentCategories].sort((a: any, b: any) => {
    const aIsOutlet = (a.handle || "").toLowerCase() === "outlet"
    const bIsOutlet = (b.handle || "").toLowerCase() === "outlet"
    if (aIsOutlet && !bIsOutlet) return 1
    if (!aIsOutlet && bIsOutlet) return -1
    return 0
  })
  const mainCategories = sorted.slice(0, 8).map((c: any) => ({
    ...c,
    _image: getCategoryImage(c),
  }))

  const lcProductCards = lcEquestrianProducts.map((product) => (
    <div
      key={product.id}
      className="flex-none w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)] xl:w-[calc(20%-13px)]"
    >
      <ProductCardModern region={region} product={product} />
    </div>
  ))

  const newProductCards = newProducts.map((product) => (
    <div
      key={product.id}
      className="flex-none w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)] xl:w-[calc(20%-13px)]"
    >
      <ProductCardModern region={region} product={product} />
    </div>
  ))

  return (
    <HomeContent
      region={region}
      lcEquestrianProducts={lcEquestrianProducts}
      newProducts={newProducts}
      mainCategories={mainCategories}
      lcProductCards={lcProductCards}
      newProductCards={newProductCards}
    />
  )
}
