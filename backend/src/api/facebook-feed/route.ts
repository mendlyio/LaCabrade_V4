import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { Client } from 'pg'

const STORE_URL = process.env.STORE_URL || 'https://www.sellerie-lacabrade.be'

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeCsv(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
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
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('//')) return `https:${value}`
  if (value.startsWith('/')) return `${STORE_URL}${value}`
  return `https://${value}`
}

function isValidGtin(barcode: string): boolean {
  if (!barcode) return false
  const digits = barcode.replace(/\D/g, '')
  return [8, 12, 13, 14].includes(digits.length)
}

/** Catégorie Facebook la plus appropriée selon le titre/collection. */
function getFacebookCategory(collection: string, categories: string[]): string {
  const all = [collection, ...categories].join(' ').toLowerCase()
  if (/sell[ei]|selle\b|saddle/.test(all))              return 'Sporting Goods > Outdoor Recreation > Equestrian > Saddles'
  if (/bride|filet|licol|bridle|headstall/.test(all))   return 'Sporting Goods > Outdoor Recreation > Equestrian > Horse Tack'
  if (/bombe|casque|helmet/.test(all))                  return 'Sporting Goods > Outdoor Recreation > Equestrian > Riding Helmets'
  if (/botte|boot/.test(all))                           return 'Clothing & Accessories > Shoes > Boots'
  if (/chaps?|mini[-\s]?chaps?/.test(all))              return 'Clothing & Accessories > Clothing > Pants'
  if (/vêt|habits?|vest|gilet|jacket|blouson/.test(all)) return 'Clothing & Accessories > Clothing'
  if (/gant|glove/.test(all))                           return 'Clothing & Accessories > Clothing Accessories > Gloves & Mittens'
  if (/tapis|pad|couvert|blanket/.test(all))            return 'Sporting Goods > Outdoor Recreation > Equestrian > Horse Blankets & Sheets'
  if (/étrier|stirrup/.test(all))                       return 'Sporting Goods > Outdoor Recreation > Equestrian > Stirrups'
  if (/soin|entret|care|nettoy/.test(all))              return 'Health & Beauty > Personal Care'
  return 'Sporting Goods > Outdoor Recreation > Equestrian'
}

function inferGender(text: string): string {
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
  if (/ONE\s*SIZE|TAILLE\s*UNIQUE|UNIQUE/.test(t)) return 'ONE SIZE'
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
    [/\bmiel\b/, 'honey'],
    [/\bcognac\b/, 'cognac'],
    [/\btaupe\b/, 'taupe'],
    [/\banthracite\b/, 'anthracite'],
    [/\bcamel\b/, 'camel'],
    [/\bchocolat\b/, 'chocolate brown'],
    [/\bécru\b|ecru/, 'ecru'],
    [/\bcrème\b|creme/, 'cream'],
  ]
  for (const [pattern, color] of colorMap) {
    if (pattern.test(t)) return color
  }
  return ''
}

function isApparelProduct(text: string): boolean {
  return /(shirt|t-?shirt|polo|pull|sweat|veste|jacket|pantalon|legging|gants?|gloves?|botte|boots?|mini[-\s]?chaps?|chaps?|chaussures?|socks?|casque|helmet|bombe|bonnet|hoodie|bomber|ceinture|belt|longe|bridon|bridle|collant|chemise|blouson|polaire|softshell|parka|manteau|doudoune|couvre[-\s]?(reins|nuque|dos)|gilet)/i.test(text)
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

// ── Colonnes CSV Facebook Catalog ─────────────────────────────────────────────
// Référence : https://www.facebook.com/business/help/120325381656392
const CSV_HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'google_product_category',
  'fb_product_category',
  'item_group_id',
  'color',
  'size',
  'gender',
  'age_group',
  'gtin',
  'mpn',
  'identifier_exists',
  'product_type',
  'sale_price',
  'custom_label_0',
  'custom_label_1',
  'shipping',
]

// ── Route principale ──────────────────────────────────────────────────────────

/**
 * GET /facebook-feed
 *
 * Génère un fichier CSV dynamique compatible Facebook/Meta Catalog.
 * Le stock et les prix sont récupérés en temps réel depuis la base de données.
 *
 * URL à configurer dans Meta Business Manager > Commerce Manager > Catalogue > Sources de données :
 *   https://backend-production-7bbb.up.railway.app/facebook-feed
 *
 * Format : CSV UTF-8 avec en-têtes, virgule comme séparateur.
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
    // ── Récupération produits publiés ──────────────────────────────────────
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

    // ── Récupération prix + stock via SQL ──────────────────────────────────
    const variantIds = allProducts.flatMap((p: any) =>
      (p.variants ?? []).map((v: any) => v.id)
    )

    const priceByVariantId = new Map<string, number>()
    const availableByVariantId = new Map<string, number>()

    if (variantIds.length > 0) {
      await dbClient.connect()
      dbConnected = true

      // Prix EUR
      const { rows: priceRows } = await dbClient.query(
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

      for (const row of priceRows) {
        if (!priceByVariantId.has(row.variant_id)) {
          priceByVariantId.set(row.variant_id, Number(row.amount))
        }
      }

      // Stock disponible = stocked_quantity - reserved_quantity
      const { rows: stockRows } = await dbClient.query(
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

      for (const row of stockRows) {
        availableByVariantId.set(row.variant_id, Number(row.available))
      }
    }

    // ── Construction des lignes CSV ────────────────────────────────────────
    const rows: string[] = [CSV_HEADERS.join(',')]

    for (const product of allProducts) {
      const variants: any[] = product.variants ?? []
      const hasMultipleVariants = variants.length > 1

      const collectionTitle: string = product.collection?.title ?? ''
      const categoryNames: string[] = (product.categories ?? []).map((c: any) => c.name)
      const productText = `${product.title || ''} ${stripHtml(product.description || '')} ${collectionTitle} ${categoryNames.join(' ')}`

      if (shouldExcludeByPolicy(productText)) continue

      const fbCategory = getFacebookCategory(collectionTitle, categoryNames)
      const productType = collectionTitle || (categoryNames.length > 0 ? categoryNames.join(' > ') : '')

      for (const variant of variants) {
        // Prix
        const amount = Number(priceByVariantId.get(variant.id) ?? 0)
        if (amount <= 0) continue

        // Stock
        const qty: number = Number(
          availableByVariantId.get(variant.id) ?? variant.inventory_quantity ?? 0
        )
        const availability = qty > 0 ? 'in stock' : 'out of stock'

        // Image principale
        const rawImage =
          product.thumbnail ||
          product.images?.[0]?.url ||
          (typeof product.images?.[0] === 'string' ? product.images[0] : '')
        if (!rawImage) continue

        const imageLink = resolvePublicUrl(rawImage)
        if (!imageLink) continue

        // Images additionnelles (max 10, séparées par virgule dans la cellule)
        const additionalImages: string[] = []
        if (Array.isArray(product.images)) {
          for (const img of product.images) {
            const url: string = typeof img === 'string' ? img : img?.url ?? ''
            if (!url || url === rawImage) continue
            const absUrl = resolvePublicUrl(url)
            if (absUrl && additionalImages.length < 10) additionalImages.push(absUrl)
          }
        }

        // Titre
        const isDefault =
          !variant.title || ['Default Title', 'Default', 'default'].includes(variant.title)
        const rawTitle = isDefault
          ? (product.title ?? '')
          : `${product.title} - ${variant.title}`
        const title = rawTitle.substring(0, 150)

        // Description
        const description = stripHtml(product.description || product.title || '')
          .substring(0, 9999) || title

        // Identifiants
        const brand =
          product.metadata?.brand ||
          product.metadata?.vendor ||
          product.metadata?.marque ||
          'La Cabrade'
        const offerId = String(variant.sku || variant.id).trim().substring(0, 100)
        const productUrl = hasMultipleVariants
          ? `${STORE_URL}/products/${product.handle}?variant=${variant.id}`
          : `${STORE_URL}/products/${product.handle}`

        // Couleur / taille depuis les options de variante
        let color = ''
        let size = ''
        if (Array.isArray(variant.options)) {
          for (const opt of variant.options) {
            const label = (opt.option?.title || '').toLowerCase().trim()
            if (/(couleur|color|colour)/.test(label)) color = opt.value || ''
            else if (/(taille|size|pointure|tour de tête|tour)/.test(label)) size = opt.value || ''
          }
        }
        if (!color) color = inferColorFromText(`${variant.title || ''} ${product.title || ''}`)
        if (!size) size = inferSizeFromTitle(`${variant.title || ''} ${product.title || ''}`)

        const isApparel = isApparelProduct(`${title} ${productType}`)
        const gender = inferGender(`${title} ${productType} ${collectionTitle} ${categoryNames.join(' ')}`)
        const ageGroup = (() => {
          const t = `${title} ${productType}`.toLowerCase()
          if (/(newborn|nouveau[-\s]?n[ée]|0[-\s]?3\s*mois)/.test(t)) return 'newborn'
          if (/(infant|b[ée]b[ée]|3[-\s]?12\s*mois)/.test(t)) return 'infant'
          if (/(toddler|tout[-\s]?petit|1[-\s]?5\s*ans)/.test(t)) return 'toddler'
          if (/(kids?|\benfant\b|junior)/.test(t)) return 'kids'
          return 'adult'
        })()

        // GTIN / MPN
        const hasValidGtin = isValidGtin(variant.barcode)
        const gtinValue = hasValidGtin ? variant.barcode.replace(/\D/g, '') : ''
        const mpn = (variant.sku || variant.id).substring(0, 70)
        const identifierExists = hasValidGtin ? 'yes' : 'no'

        // Livraison encodée : country:region:service:price (Facebook format)
        const shippingBE = `BE:::${amount >= 75 ? '0.00 EUR' : '5.95 EUR'}`
        const shippingFR = `FR:::${amount >= 75 ? '0.00 EUR' : '8.95 EUR'}`
        const shippingField = `${shippingBE},${shippingFR}`

        // custom_label_0 : fourchette de prix (utile pour les audiences)
        const priceLabel =
          amount < 30 ? 'moins_30'
          : amount < 60 ? '30_60'
          : amount < 100 ? '60_100'
          : amount < 200 ? '100_200'
          : 'plus_200'

        // custom_label_1 : collection
        const collectionLabel = collectionTitle || 'general'

        const cols = [
          offerId,
          title,
          description,
          availability,
          'new',
          `${amount.toFixed(2)} EUR`,
          productUrl,
          imageLink,
          additionalImages.join(','),
          brand,
          fbCategory,
          fbCategory,
          hasMultipleVariants ? product.id : '',
          isApparel ? (color || inferColorFromText(`${variant.title || ''} ${product.title || ''}`) || 'black') : color,
          size,
          isApparel ? gender : '',
          isApparel ? ageGroup : '',
          gtinValue,
          mpn,
          identifierExists,
          productType,
          '',   // sale_price (vide = pas de promo)
          priceLabel,
          collectionLabel,
          shippingField,
        ]

        rows.push(cols.map(escapeCsv).join(','))
      }
    }

    const csv = rows.join('\r\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'inline; filename="facebook-catalog.csv"')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.status(200).send('\uFEFF' + csv) // BOM UTF-8 pour compatibilité Excel/Meta

  } catch (error: any) {
    console.error('❌ [FacebookFeed] Erreur:', error.message)
    return res.status(500).json({ success: false, message: error.message })
  } finally {
    if (dbConnected) {
      await dbClient.end().catch(() => undefined)
    }
  }
}
