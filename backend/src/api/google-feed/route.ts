import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { Client } from 'pg'

const STORE_URL = process.env.STORE_URL || 'https://www.sellerie-lacabrade.be'
const STORE_NAME = 'La Cabrade'

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function stripHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim()
}

function resolvePublicUrl(raw: string): string {
  if (!raw) return ''
  const value = raw.trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return encodeURI(value)
  }
  if (value.startsWith('//')) {
    return encodeURI(`https:${value}`)
  }
  if (value.startsWith('/')) {
    return encodeURI(`${STORE_URL}${value}`)
  }
  return encodeURI(`https://${value}`)
}

function isValidGtin(barcode: string): boolean {
  if (!barcode) return false
  const digits = barcode.replace(/\D/g, '')
  return [8, 12, 13, 14].includes(digits.length)
}

function getGoogleCategory(collection: string, categories: string[]): string {
  const all = [collection, ...categories].join(' ').toLowerCase()
  if (/sell[ei]|selle\b|saddle/.test(all))              return '6935'
  if (/bride|filet|licol|bridle|headstall/.test(all))   return '7291'
  if (/bombe|casque|helmet/.test(all))                  return '499713'
  if (/botte|boot|chap/.test(all))                      return '1604'
  if (/vêt|habits?|vest|gilet|jacket|blouson/.test(all)) return '1604'
  if (/gant|glove/.test(all))                           return '6439'
  if (/tapis|pad|couvert|blanket/.test(all))            return '7293'
  if (/étrier|stirrup/.test(all))                       return '7290'
  if (/soin|entret|care|nettoy/.test(all))              return '6937'
  if (/équit|horse|cheval|equestri/.test(all))          return '6935'
  return ''
}

function isApparelProduct(text: string): boolean {
  return /(shirt|t-?shirt|polo|pull|sweat|veste|jacket|pantalon|legging|gants?|gloves?|botte|boots?|chaussures?|socks?|casque|helmet|bonnet|hoodie|bomber|ceinture|belt|longe|bridon|bridle|collant|chemise|blouson)/i.test(
    text
  )
}

function inferGender(text: string): 'male' | 'female' | 'unisex' {
  const t = text.toLowerCase()
  if (/(femme|women|woman|lady|ladies|girl|filles?)/.test(t)) return 'female'
  if (/(homme|men|man|boy|gar[cç]ons?)/.test(t)) return 'male'
  return 'unisex'
}

function inferSizeFromTitle(title: string): string {
  if (!title) return ''
  const t = title.toUpperCase()
  const match = t.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL)\b/)
  if (match) return match[1]
  const num = t.match(/\b(\d{2,3})\b/)
  if (num) return num[1]
  if (/ONE\s*SIZE|TAILLE\s*UNIQUE|UNIQUE/.test(t)) return 'one size'
  return ''
}

function inferColorFromText(text: string): string {
  if (!text) return ''
  const t = text.toLowerCase()
  const colorMap: Array<[RegExp, string]> = [
    [/(bleu marine|navy)/, 'navy'],
    [/\bbleu\b/, 'blue'],
    [/\bnoir\b|black/, 'black'],
    [/\bblanc\b|white/, 'white'],
    [/\bbrun\b|\bmarron\b|brown/, 'brown'],
    [/\bgris\b|grey|gray/, 'gray'],
    [/\brouge\b|red/, 'red'],
    [/\bvert\b|green/, 'green'],
    [/\bbeige\b/, 'beige'],
    [/\bbordeaux\b|burgundy/, 'burgundy'],
    [/\brose\b|pink/, 'pink'],
    [/\bviolet\b|purple/, 'purple'],
    [/\bjaune\b|yellow/, 'yellow'],
    [/\borange\b/, 'orange'],
  ]
  for (const [pattern, color] of colorMap) {
    if (pattern.test(t)) return color
  }
  return ''
}

function shouldExcludeByPolicy(text: string): boolean {
  const t = text.toLowerCase()
  const blockedPatterns = [
    /cartouche/,
    /\bspark\b/,
    /\bhelite\b/,
    /airbag.{0,15}\b\d{2}\s*gr\b/,
    /electrolyte|electrolytes|biotine|metabo|vitargil|xanthus|ungula|vital herbs|gattilier|pro skin|sos derm|dermite|sar'x|super itch/,
    /shampoing|shampoo|baume|cr[eè]me|gel apaisant|lait sos/,
  ]
  return blockedPatterns.some((p) => p.test(t))
}

// ── Route principale ─────────────────────────────────────────────────────────

/**
 * GET /google-feed
 *
 * Flux RSS/XML Google Shopping — accessible publiquement (pas de publishable key).
 * Utilise remoteQuery pour joindre les prix (Pricing module) aux variantes (Product module).
 *
 * URL Merchant Center : https://backend-production-7bbb.up.railway.app/google-feed
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productService = req.scope.resolve(Modules.PRODUCT)
  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway')
      ? { rejectUnauthorized: false }
      : false,
  })
  let dbConnected = false

  try {
    // ── Récupération produits publiés (sans pricing) ───────────────────────
    const allProducts: any[] = []
    let offset = 0
    const take = 100

    while (true) {
      const products = await productService.listProducts(
        { status: 'published' },
        {
          relations: [
            'variants',
            'variants.options',
            'variants.options.option',
            'images',
            'collection',
            'categories',
          ],
          take,
          skip: offset,
        }
      )

      if (!products?.length) break
      allProducts.push(...products)
      if (products.length < take) break
      offset += take
    }

    // ── Récupération prix EUR via SQL (source de vérité pricing) ───────────
    const variantIds = allProducts.flatMap((p: any) =>
      (p.variants ?? []).map((v: any) => v.id)
    )

    const priceByVariantId = new Map<string, number>()
    const availableByVariantId = new Map<string, number>()
    if (variantIds.length > 0) {
      await dbClient.connect()
      dbConnected = true
      const { rows } = await dbClient.query(
        `
          SELECT
            pv.id AS variant_id,
            pp.amount AS amount
          FROM product_variant pv
          LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
          LEFT JOIN price_set ps ON ps.id = pvps.price_set_id
          LEFT JOIN price pp ON pp.price_set_id = ps.id
          WHERE pv.id = ANY($1)
            AND pp.currency_code = 'eur'
            AND pp.amount IS NOT NULL
            AND pp.deleted_at IS NULL
          ORDER BY pv.id, pp.created_at DESC
        `,
        [variantIds]
      )

      // Garder le premier prix trouvé par variante (plus récent via ORDER BY)
      for (const row of rows) {
        if (!priceByVariantId.has(row.variant_id)) {
          priceByVariantId.set(row.variant_id, Number(row.amount))
        }
      }

      // Stock disponible réel = stocked_quantity - reserved_quantity
      const stockRows = await dbClient.query(
        `
          SELECT
            pvi.variant_id AS variant_id,
            COALESCE(SUM(COALESCE(il.stocked_quantity, 0) - COALESCE(il.reserved_quantity, 0)), 0) AS available
          FROM product_variant_inventory_item pvi
          LEFT JOIN inventory_level il
            ON il.inventory_item_id = pvi.inventory_item_id
            AND il.deleted_at IS NULL
          WHERE pvi.variant_id = ANY($1)
          GROUP BY pvi.variant_id
        `,
        [variantIds]
      )

      for (const row of stockRows.rows) {
        availableByVariantId.set(row.variant_id, Number(row.available))
      }
    }

    // ── Génération des <item> ──────────────────────────────────────────────
    const items: string[] = []

    for (const product of allProducts) {
      const variants: any[] = product.variants ?? []
      const hasMultipleVariants = variants.length > 1

      const collectionTitle: string = product.collection?.title ?? ''
      const categoryNames: string[] = (product.categories ?? []).map((c: any) => c.name)
      const productTextForPolicy = `${product.title || ''} ${stripHtml(product.description || '')} ${collectionTitle} ${categoryNames.join(' ')}`
      if (shouldExcludeByPolicy(productTextForPolicy)) {
        continue
      }
      const googleCategory = getGoogleCategory(collectionTitle, categoryNames)
      const productType = collectionTitle || (categoryNames.length > 0 ? categoryNames.join(' > ') : '')

      for (const variant of variants) {
        // ── Prix EUR ───────────────────────────────────────────────────────
        const amount = Number(priceByVariantId.get(variant.id) ?? 0)
        if (amount <= 0) continue

        // ── Disponibilité ──────────────────────────────────────────────────
        const qty: number =
          Number(availableByVariantId.get(variant.id) ?? variant.inventory_quantity ?? 0)
        const availability = qty > 0 ? 'in stock' : 'out of stock'

        // ── Image ──────────────────────────────────────────────────────────
        const rawImage =
          product.thumbnail ||
          product.images?.[0]?.url ||
          (typeof product.images?.[0] === 'string' ? product.images[0] : '')
        if (!rawImage) continue

        const imageLink = resolvePublicUrl(rawImage)
        if (!imageLink) continue

        const additionalImages: string[] = []
        if (Array.isArray(product.images)) {
          for (const img of product.images) {
            const url: string = typeof img === 'string' ? img : img?.url ?? ''
            if (!url || url === rawImage) continue
            const absUrl = resolvePublicUrl(url)
            if (!absUrl) continue
            if (additionalImages.length < 10) additionalImages.push(absUrl)
          }
        }

        // ── Titre / Description ────────────────────────────────────────────
        const isDefault =
          !variant.title || ['Default Title', 'Default', 'default'].includes(variant.title)
        const rawTitle = isDefault ? (product.title ?? '') : `${product.title} - ${variant.title}`
        const title = rawTitle.substring(0, 150)
        const description = (stripHtml(product.description || product.title || '')).substring(0, 5000) || title

        // ── Marque / ID / URL ──────────────────────────────────────────────
        const brand = product.metadata?.brand || product.metadata?.vendor || product.metadata?.marque || 'La Cabrade'
        const offerId = (variant.sku || variant.id).substring(0, 50)
        const productUrl = hasMultipleVariants
          ? `${STORE_URL}/products/${product.handle}?variant=${variant.id}`
          : `${STORE_URL}/products/${product.handle}`

        // ── Options couleur / taille ───────────────────────────────────────
        let color = ''
        let size = ''
        if (Array.isArray(variant.options)) {
          for (const opt of variant.options) {
            const label = (opt.option?.title || '').toLowerCase().trim()
            if (/(couleur|color|colour)/.test(label)) color = opt.value || ''
            else if (/(taille|size|pointure|tour de tête|tour)/.test(label)) size = opt.value || ''
          }
        }
        if (!color) {
          color = inferColorFromText(`${variant.title || ''} ${product.title || ''}`)
        }
        if (!size) {
          size = inferSizeFromTitle(`${variant.title || ''} ${product.title || ''}`)
        }

        const apparelContext = `${title} ${productType} ${collectionTitle} ${categoryNames.join(' ')}`
        const isApparel = isApparelProduct(apparelContext) || !!size || !!color
        const gender = inferGender(apparelContext)
        const ageGroup = 'adult'
        const safeSize = size || (isApparel ? 'one size' : '')

        // ── GTIN / MPN ─────────────────────────────────────────────────────
        const hasValidGtin = isValidGtin(variant.barcode)
        const mpn = (variant.sku || variant.id).substring(0, 70)

        const itemXml = `    <item>
      <g:id>${escapeXml(offerId)}</g:id>
      <title>${escapeXml(title)}</title>
      <g:title>${escapeXml(title)}</g:title>
      <description>${escapeXml(description)}</description>
      <g:description>${escapeXml(description)}</g:description>
      <link>${escapeXml(productUrl)}</link>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>${additionalImages.map(url => `
      <g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`).join('')}
      <g:price>${amount.toFixed(2)} EUR</g:price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>${hasValidGtin ? `
      <g:gtin>${escapeXml(variant.barcode.replace(/\D/g, ''))}</g:gtin>
      <g:mpn>${escapeXml(mpn)}</g:mpn>` : `
      <g:mpn>${escapeXml(mpn)}</g:mpn>
      <g:identifier_exists>no</g:identifier_exists>`}${isApparel ? `
      <g:gender>${gender}</g:gender>
      <g:age_group>${ageGroup}</g:age_group>${safeSize ? `
      <g:size>${escapeXml(safeSize)}</g:size>` : ''}` : ''}${hasMultipleVariants ? `
      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>` : ''}${color ? `
      <g:color>${escapeXml(color)}</g:color>` : ''}${!isApparel && size ? `
      <g:size>${escapeXml(size)}</g:size>` : ''}${productType ? `
      <g:product_type>${escapeXml(productType)}</g:product_type>` : ''}${googleCategory ? `
      <g:google_product_category>${googleCategory}</g:google_product_category>` : ''}
      <g:shipping>
        <g:country>BE</g:country>
        <g:service>Standard Bpost</g:service>
        <g:price>${amount >= 75 ? '0.00' : '5.95'} EUR</g:price>
      </g:shipping>
      <g:shipping>
        <g:country>FR</g:country>
        <g:service>Standard</g:service>
        <g:price>${amount >= 75 ? '0.00' : '8.95'} EUR</g:price>
      </g:shipping>
    </item>`

        items.push(itemXml)
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(STORE_NAME)}</title>
    <link>${escapeXml(STORE_URL)}</link>
    <description>Catalogue produits ${escapeXml(STORE_NAME)}</description>
${items.join('\n')}
  </channel>
</rss>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.status(200).send(xml)

  } catch (error: any) {
    console.error('❌ [GoogleFeed] Erreur:', error.message)
    return res.status(500).json({ success: false, message: error.message })
  } finally {
    if (dbConnected) {
      await dbClient.end().catch(() => undefined)
    }
  }
}
