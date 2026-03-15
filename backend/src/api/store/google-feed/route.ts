import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'

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

/** Supprime les balises HTML (description peut venir d'un éditeur riche) */
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

/**
 * Valide qu'un barcode est un GTIN conforme Google (8, 12, 13 ou 14 chiffres).
 * Un barcode non valide déclenche des erreurs de données dans Merchant Center.
 */
function isValidGtin(barcode: string): boolean {
  if (!barcode) return false
  const digits = barcode.replace(/\D/g, '')
  return [8, 12, 13, 14].includes(digits.length)
}

/**
 * Mappe les noms de collections/catégories vers les IDs de taxonomie Google.
 * Référence : https://www.google.com/basepages/producttype/taxonomy-with-ids.fr-BE.txt
 */
function getGoogleCategory(collection: string, categories: string[]): string {
  const all = [collection, ...categories].join(' ').toLowerCase()

  if (/sell[ei]|selle\b|saddle/.test(all))             return '6935' // Équitation > Selles
  if (/bride|filet|licol|bridle|headstall/.test(all))  return '7291' // Équitation > Brides
  if (/bombe|casque|helmet/.test(all))                 return '499713' // Équitation > Casques
  if (/botte|boot|chap/.test(all))                     return '1604'  // Vêtements > Chaussures
  if (/vêt|habits?|vest|gilet|jacket|blouson/.test(all)) return '1604' // Vêtements
  if (/gant|glove/.test(all))                          return '6439'  // Gants d'équitation
  if (/tapis|pad|couvert|blanket/.test(all))           return '7293'  // Équitation > Tapis
  if (/étrier|stirrup/.test(all))                      return '7290'  // Équitation > Étriers
  if (/soin|entret|care|nettoy/.test(all))             return '6937'  // Équitation > Soins
  if (/équit|horse|cheval|equestri/.test(all))         return '6935'  // Équitation (fallback)

  return '' // Laisser Google classifier automatiquement
}

// ── Route principale ─────────────────────────────────────────────────────────

/**
 * GET /store/google-feed
 *
 * Flux RSS/XML au format Google Shopping 100% conforme :
 * - Champs obligatoires : id, title, description, link, image_link,
 *   price (TVA incluse), availability, condition, brand, gtin/mpn
 * - Champs recommandés : shipping BE, google_product_category, item_group_id,
 *   color, size, additional_image_link, product_type
 * - Validation GTIN (8/12/13/14 chiffres), HTML strippé de la description
 *
 * À configurer dans Merchant Center → Sources de données → Récupération planifiée
 * URL : https://backend-production-7bbb.up.railway.app/store/google-feed
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productService = req.scope.resolve(Modules.PRODUCT)

  try {
    // ── Récupération de tous les produits publiés ──────────────────────────
    const allProducts: any[] = []
    let offset = 0
    const take = 100

    while (true) {
      const products = await productService.listProducts(
        { status: 'published' },
        {
          relations: [
            'variants',
            'variants.prices',
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

    // ── Génération des <item> ──────────────────────────────────────────────
    const items: string[] = []

    for (const product of allProducts) {
      const variants: any[] = (product as any).variants ?? []
      const hasMultipleVariants = variants.length > 1

      // Catégorie Google calculée une fois par produit
      const collectionTitle: string = product.collection?.title ?? ''
      const categoryNames: string[] = (product.categories ?? []).map((c: any) => c.name)
      const googleCategory = getGoogleCategory(collectionTitle, categoryNames)

      // product_type : collection > catégorie (pour les filtres Google)
      const productType =
        collectionTitle ||
        (categoryNames.length > 0 ? categoryNames.join(' > ') : '')

      for (const variant of variants) {
        // ── Prix EUR (TVA incluse, obligatoire en Belgique) ────────────────
        const eurPrice = (variant.prices ?? []).find(
          (p: any) => p.currency_code?.toLowerCase() === 'eur'
        )
        if (!eurPrice) continue

        const rawAmount =
          typeof eurPrice.amount === 'number'
            ? eurPrice.amount
            : parseFloat(String(eurPrice.amount))
        const amount = rawAmount / 100
        if (amount <= 0) continue

        // ── Disponibilité ──────────────────────────────────────────────────
        const qty: number = variant.inventory_quantity ?? 0
        const availability = qty > 0 ? 'in stock' : 'out of stock'

        // ── Image principale ───────────────────────────────────────────────
        // thumbnail d'abord, puis première image du tableau
        const rawImage =
          product.thumbnail ||
          product.images?.[0]?.url ||
          (typeof product.images?.[0] === 'string' ? product.images[0] : '')
        if (!rawImage) continue // Google refuse les produits sans image

        // S'assurer que l'URL est absolue
        const imageLink = rawImage.startsWith('http')
          ? rawImage
          : `https://${rawImage}`

        // ── Images supplémentaires (max 10) ────────────────────────────────
        const additionalImages: string[] = []
        if (Array.isArray(product.images)) {
          for (const img of product.images) {
            const url: string = typeof img === 'string' ? img : img?.url ?? ''
            if (!url || url === rawImage) continue
            const absUrl = url.startsWith('http') ? url : `https://${url}`
            if (additionalImages.length < 10) additionalImages.push(absUrl)
          }
        }

        // ── Titre (max 150 chars) ──────────────────────────────────────────
        const isDefault =
          !variant.title ||
          ['Default Title', 'Default', 'default'].includes(variant.title)
        const rawTitle = isDefault
          ? (product.title ?? '')
          : `${product.title} - ${variant.title}`
        const title = rawTitle.substring(0, 150)

        // ── Description : HTML strippé, min 1 char ─────────────────────────
        // Google refuse le HTML dans la description
        const rawDesc = stripHtml(product.description || product.title || '')
        const description = rawDesc.substring(0, 5000) || title

        // ── Marque ─────────────────────────────────────────────────────────
        const brand: string =
          product.metadata?.brand ||
          product.metadata?.vendor ||
          product.metadata?.marque ||
          'La Cabrade'

        // ── ID produit : SKU si dispo (plus lisible), sinon variant.id ─────
        // Google recommande un ID stable et court (max 50 chars)
        const offerId: string = (variant.sku || variant.id).substring(0, 50)

        // ── URL avec ancre variante pour atterrir sur la bonne variante ────
        const productUrl = hasMultipleVariants
          ? `${STORE_URL}/products/${product.handle}?variant=${variant.id}`
          : `${STORE_URL}/products/${product.handle}`

        // ── Options : couleur / taille ─────────────────────────────────────
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
        // GTIN = barcode EAN-13 valide uniquement (8/12/13/14 chiffres)
        // Si invalide → on passe en MPN pour éviter les erreurs Merchant Center
        const hasValidGtin = isValidGtin(variant.barcode)
        const mpn: string = (variant.sku || variant.id).substring(0, 70)

        // ── Construction du <item> ─────────────────────────────────────────
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

    // ── Enveloppe RSS ──────────────────────────────────────────────────────
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
    console.error('❌ [GoogleFeed] Erreur génération XML:', error.message)
    return res.status(500).json({ success: false, message: error.message })
  }
}
