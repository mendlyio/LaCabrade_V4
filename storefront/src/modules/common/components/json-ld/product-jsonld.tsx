import { HttpTypes } from "@medusajs/types"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"

type ProductJsonLdProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
  breadcrumb?: { name: string; handle: string }[]
}

export default function ProductJsonLd({
  product,
  countryCode,
  breadcrumb,
}: ProductJsonLdProps) {
  const variant = product.variants?.[0]
  const price = (variant as any)?.calculated_price?.calculated_amount
  const currency =
    (variant as any)?.calculated_price?.currency_code?.toUpperCase() ?? "EUR"
  const originalPrice = (variant as any)?.calculated_price?.original_amount

  const inStock = product.variants?.some((v) => {
    if (!v.manage_inventory || v.allow_backorder) return true
    return (v.inventory_quantity ?? 0) > 0
  })

  const images =
    product.images?.map((img) => img.url).filter(Boolean) ??
    (product.thumbnail ? [product.thumbnail] : [])

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: images,
    url: `${BASE_URL}/${countryCode}/products/${product.handle}`,
    sku: variant?.sku ?? variant?.id,
    brand: {
      "@type": "Brand",
      name: product.collection?.title ?? "La Cabrade",
    },
    ...(product.material && { material: product.material }),
    ...(product.weight && { weight: { "@type": "QuantitativeValue", value: product.weight, unitCode: "GRM" } }),
  }

  if (price != null) {
    const offers: Record<string, unknown> = {
      "@type": "Offer",
      url: `${BASE_URL}/${countryCode}/products/${product.handle}`,
      priceCurrency: currency,
      price: price.toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "La Cabrade",
      },
    }

    if (originalPrice != null && originalPrice > price) {
      offers.priceValidUntil = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0]
    }

    productSchema.offers = offers
  }

  if (product.categories?.length) {
    productSchema.category = product.categories
      .map((c) => c.name)
      .filter(Boolean)
      .join(" > ")
  }

  const schemas: Record<string, unknown>[] = [productSchema]

  if (breadcrumb?.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: `${BASE_URL}/${countryCode}`,
        },
        ...breadcrumb.map((crumb, idx) => ({
          "@type": "ListItem",
          position: idx + 2,
          name: crumb.name,
          item: `${BASE_URL}/${countryCode}/categories/${encodeURIComponent(crumb.handle)}`,
        })),
        {
          "@type": "ListItem",
          position: breadcrumb.length + 2,
          name: product.title,
          item: `${BASE_URL}/${countryCode}/products/${product.handle}`,
        },
      ],
    })
  }

  return (
    <>
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}
