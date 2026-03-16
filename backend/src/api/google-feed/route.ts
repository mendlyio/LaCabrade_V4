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
    }

    // ── Génération des <item> ──────────────────────────────────────────────
    const items: string[] = []

    for (const product of allProducts) {
      const variants: any[] = product.variants ?? []
      const hasMultipleVariants = variants.length > 1

      const collectionTitle: string = product.collection?.title ?? ''
      const categoryNames: string[] = (product.categories ?? []).map((c: any) => c.name)
      const googleCategory = getGoogleCategory(collectionTitle, categoryNames)
      const productType = collectionTitle || (categoryNames.length > 0 ? categoryNames.join(' > ') : '')

      for (const variant of variants) {
        // ── Prix EUR ───────────────────────────────────────────────────────
        const amount = Number(priceByVariantId.get(variant.id) ?? 0)
        if (amount <= 0) continue

        // ── Disponibilité ──────────────────────────────────────────────────
        const qty: number = variant.inventory_quantity ?? 0
        const availability = qty > 0 ? 'in stock' : 'out of stock'

        // ── Image ──────────────────────────────────────────────────────────
        const rawImage =
          product.thumbnail ||
          product.images?.[0]?.url ||
          (typeof product.images?.[0] === 'string' ? product.images[0] : '')
        if (!rawImage) continue

        const imageLink = rawImage.startsWith('http') ? rawImage : `https://${rawImage}`

        const additionalImages: string[] = []
        if (Array.isArray(product.images)) {
          for (const img of product.images) {
            const url: string = typeof img === 'string' ? img : img?.url ?? ''
            if (!url || url === rawImage) continue
            const absUrl = url.startsWith('http') ? url : `https://${url}`
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
            const label = (opt.option?.title || '').toLowerCase()
            if (['couleur', 'color', 'colour'].includes(label)) color = opt.value || ''
            else if (['taille', 'size', 'pointure', 'tour de tête'].includes(label)) size = opt.value || ''
          }
        }

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
      <g:identifier_exists>no</g:identifier_exists>`}${hasMultipleVariants ? `
      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>` : ''}${color ? `
      <g:color>${escapeXml(color)}</g:color>` : ''}${size ? `
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
