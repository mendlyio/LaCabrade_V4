import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
const GIFT_CARD_HANDLE = "bon-cadeau"

/**
 * Dictionnaire de synonymes équestres (clés normalisées, sans accent).
 * Permet de retrouver un produit même si le client utilise un autre mot
 * (ex. "bombe" -> "casque"). Utilisé pour l'expansion de la requête.
 */
const SYNONYMS: Record<string, string[]> = {
  bombe: ["casque"],
  casque: ["bombe"],
  tapis: ["pad", "chabraque"],
  pad: ["tapis"],
  filet: ["bridon", "bride"],
  bridon: ["filet"],
  bride: ["bridon", "filet"],
  licol: ["licou"],
  licou: ["licol"],
  couverture: ["chemise", "couvre"],
  chemise: ["couverture"],
  guetre: ["protection", "protege"],
  culotte: ["pantalon"],
  pantalon: ["culotte"],
  bonnet: ["cache oreilles"],
  sangle: ["sanglon"],
  etriviere: ["etrivieres"],
  enrenement: ["rene", "renes"],
  basket: ["chaussure", "sneaker"],
  chaussure: ["basket"],
  sirop: ["complement"],
  friandise: ["bonbon"],
}

function norm(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Singularise grossièrement un token FR (bottes -> botte, chevaux ignoré). */
function singular(token: string): string {
  if (token.length > 3 && (token.endsWith("s") || token.endsWith("x"))) {
    return token.slice(0, -1)
  }
  return token
}

/** Distance de Levenshtein (pour tolérance aux fautes sur marques/catégories). */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

/** True si `text` contient un token proche de `term` (tolérance fautes). */
function fuzzyIncludes(text: string, term: string): boolean {
  if (text.includes(term)) return true
  if (term.length < 4) return false
  const tolerance = term.length >= 7 ? 2 : 1
  for (const word of text.split(" ")) {
    if (Math.abs(word.length - term.length) <= tolerance && levenshtein(word, term) <= tolerance) {
      return true
    }
  }
  return false
}

/** Construit les variantes de requête (originale + substitutions de synonymes). */
function expandQuery(qNorm: string): string[] {
  const tokens = qNorm.split(" ").filter(Boolean)
  const variants = new Set<string>([qNorm])
  tokens.forEach((token, idx) => {
    const base = singular(token)
    const syns = SYNONYMS[base] || SYNONYMS[token]
    if (syns) {
      for (const syn of syns) {
        const copy = [...tokens]
        copy[idx] = syn
        variants.add(copy.join(" "))
        if (variants.size >= 4) break
      }
    }
  })
  return Array.from(variants).slice(0, 4)
}

function slugify(str: string): string {
  return norm(str).replace(/\s+/g, "-")
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get("q")?.trim() || ""
    const countryCode = searchParams.get("countryCode") || "fr"
    const limit = parseInt(searchParams.get("limit") || "8", 10)

    if (!q || q.length < 2) {
      return NextResponse.json({ products: [], categories: [], brands: [], count: 0 })
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (PUBLISHABLE_KEY) headers["x-publishable-api-key"] = PUBLISHABLE_KEY

    // 1. Résoudre la région
    let regionId: string | null = null
    try {
      const regRes = await fetch(new URL("/store/regions", BACKEND_URL).toString(), {
        headers,
        next: { revalidate: 300 },
      })
      if (regRes.ok) {
        const regData = await regRes.json()
        const region = (regData.regions || []).find((r: any) =>
          r.countries?.some((c: any) => c.iso_2 === countryCode.toLowerCase())
        )
        regionId = region?.id || null
      }
    } catch {
      /* noop */
    }

    const qNorm = norm(q)
    const qTokens = qNorm.split(" ").filter(Boolean).map(singular)
    const variants = expandQuery(qNorm)

    // 2. Requêtes Medusa pour chaque variante (synonymes) — en parallèle
    const fetchVariant = async (term: string) => {
      const url = new URL("/store/products", BACKEND_URL)
      url.searchParams.set("q", term)
      url.searchParams.set("limit", "20")
      url.searchParams.set("is_giftcard", "false")
      url.searchParams.set(
        "fields",
        "*variants.calculated_price,+variants.prices,+variants.sku,+images,+metadata,+collection.title,+collection.handle,+categories.name,+categories.handle"
      )
      if (regionId) url.searchParams.set("region_id", regionId)
      try {
        const r = await fetch(url.toString(), { headers, next: { revalidate: 30 } })
        if (!r.ok) return []
        const d = await r.json()
        return (d.products || []) as any[]
      } catch {
        return []
      }
    }

    const variantResults = await Promise.all(variants.map(fetchVariant))
    const byId = new Map<string, any>()
    for (const list of variantResults) {
      for (const p of list) {
        if (p.handle !== GIFT_CARD_HANDLE && !byId.has(p.id)) byId.set(p.id, p)
      }
    }
    const allProducts = Array.from(byId.values())

    // 3. Scoring multi-champs (titre, marque, catégorie, collection, sku, description)
    const allTerms = [qNorm, ...qTokens]
    const brandCount = new Map<string, { name: string; count: number }>()

    const scored = allProducts
      .map((p) => {
        const title = norm(p.title || "")
        const handle = norm(p.handle || "")
        const desc = norm(p.description || "")
        const brand = norm((p.metadata?.brand as string) || "")
        const collectionTitle = norm(p.collection?.title || "")
        const categories = (p.categories || []).map((c: any) => norm(c.name || "")).join(" ")
        const skus = (p.variants || []).map((v: any) => norm(v.sku || "")).join(" ")
        const variantTitles = (p.variants || []).map((v: any) => norm(v.title || "")).join(" ")
        const haystack = `${title} ${brand} ${collectionTitle} ${categories} ${variantTitles}`

        let score = 0
        if (title.startsWith(qNorm)) score += 100
        else if (title.includes(qNorm)) score += 60
        if (brand.includes(qNorm)) score += 50
        if (handle.includes(qNorm)) score += 30
        if (categories.includes(qNorm)) score += 25
        if (collectionTitle.includes(qNorm)) score += 20
        if (skus.includes(qNorm)) score += 40
        if (variantTitles.includes(qNorm)) score += 15
        if (desc.includes(qNorm)) score += 5

        for (const token of qTokens) {
          if (title.includes(token)) score += 10
          else if (fuzzyIncludes(title, token)) score += 6
          if (brand.includes(token)) score += 8
          if (categories.includes(token)) score += 5
          if (haystack.includes(token)) score += 3
        }

        // Marque pour les suggestions
        const rawBrand = (p.metadata?.brand as string) || p.collection?.title || ""
        if (rawBrand) {
          const key = norm(rawBrand)
          const ex = brandCount.get(key)
          brandCount.set(key, { name: rawBrand, count: (ex?.count || 0) + (score > 0 ? 1 : 0) })
        }

        const prices = (p.variants || [])
          .flatMap((v: any) =>
            v.calculated_price?.calculated_amount != null ? [v.calculated_price.calculated_amount] : []
          )
          .filter((n: number) => n > 0)
        const minPrice = prices.length > 0 ? Math.min(...prices) : null
        const currency = p.variants?.[0]?.calculated_price?.currency_code || "eur"

        return {
          id: p.id,
          title: p.title,
          handle: p.handle,
          thumbnail: p.thumbnail || p.images?.[0]?.url || null,
          collection: p.collection?.title || (p.metadata?.brand as string) || null,
          collectionHandle: p.collection?.handle || null,
          minPrice,
          currency,
          score,
        }
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    // 4. Suggestions de catégories (fuzzy sur la liste des catégories)
    let categories: Array<{ name: string; handle: string }> = []
    try {
      const catUrl = new URL("/store/product-categories", BACKEND_URL)
      catUrl.searchParams.set("limit", "200")
      catUrl.searchParams.set("fields", "id,name,handle")
      const catRes = await fetch(catUrl.toString(), { headers, next: { revalidate: 3600 } })
      if (catRes.ok) {
        const catData = await catRes.json()
        categories = (catData.product_categories || [])
          .map((c: any) => ({ name: c.name as string, handle: c.handle as string, n: norm(c.name || "") }))
          .filter((c: any) => c.handle && qTokens.some((t) => fuzzyIncludes(c.n, t)))
          .slice(0, 4)
          .map((c: any) => ({ name: c.name, handle: c.handle }))
      }
    } catch {
      /* noop */
    }

    // 5. Suggestions de marques (depuis les résultats, triées par pertinence)
    const brands = Array.from(brandCount.values())
      .filter((b) => b.count > 0 && qTokens.some((t) => fuzzyIncludes(norm(b.name), t) || norm(b.name).includes(t)))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((b) => ({ name: b.name, slug: slugify(b.name) }))

    return NextResponse.json({
      products: scored,
      categories,
      brands,
      count: scored.length,
      query: q,
    })
  } catch (err: any) {
    console.error("[api/search] Erreur:", err.message)
    return NextResponse.json({ products: [], categories: [], brands: [], count: 0 })
  }
}
