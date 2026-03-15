import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'

const STORE_URL = process.env.STORE_URL || 'https://www.sellerie-lacabrade.be'
const STORE_NAME = 'La Cabrade'

function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * GET /store/google-feed
 *
 * Génère un flux RSS/XML au format Google Shopping.
 * À configurer dans Google Merchant Center comme source de données
 * de type "Récupération planifiée" (Scheduled fetch).
 *
 * URL publique : https://backend-production-7bbb.up.railway.app/store/google-feed
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productService = req.scope.resolve(Modules.PRODUCT)
  const pricingService = req.scope.resolve(Modules.PRICING)

  try {
    // Récupérer tous les produits publiés avec leurs variantes
    let allProducts: any[] = []
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

      if (!products || products.length === 0) break
      allProducts = allProducts.concat(products)
      if (products.length < take) break
      offset += take
    }

    // Générer le XML
    const items: string[] = []

    for (const product of allProducts) {
      const variants = (product as any).variants ?? []
      const hasMultipleVariants = variants.length > 1

      for (const variant of variants) {
        // Prix EUR
        const eurPrice = (variant.prices ?? []).find(
          (p: any) => p.currency_code?.toLowerCase() === 'eur'
        )
        if (!eurPrice) continue // Skip si pas de prix EUR

        const amount = (typeof eurPrice.amount === 'number'
          ? eurPrice.amount
          : parseFloat(String(eurPrice.amount))) / 100

        if (amount <= 0) continue // Skip les prix à 0

        // Disponibilité
        const qty = variant.inventory_quantity ?? 0
        const availability = qty > 0 ? 'in stock' : 'out of stock'

        // Titre
        const isDefault =
          !variant.title ||
          variant.title === 'Default Title' ||
          variant.title === 'Default'
        const title = isDefault
          ? product.title
          : `${product.title} - ${variant.title}`

        // Image
        const imageLink =
          product.thumbnail ||
          product.images?.[0]?.url ||
          product.images?.[0] ||
          ''

        if (!imageLink) continue // Google exige une image

        // Images supplémentaires
        const additionalImages: string[] = []
        if (Array.isArray(product.images)) {
          for (const img of product.images) {
            const url = typeof img === 'string' ? img : img?.url
            if (url && url !== imageLink && additionalImages.length < 10) {
              additionalImages.push(url)
            }
          }
        }

        // Marque
        const brand =
          product.metadata?.brand ||
          product.metadata?.vendor ||
          product.metadata?.marque ||
          'La Cabrade'

        // Options variante
        let color = ''
        let size = ''
        if (Array.isArray(variant.options)) {
          for (const opt of variant.options) {
            const label = (opt.option?.title || '').toLowerCase()
            if (['couleur', 'color', 'colour'].includes(label)) color = opt.value || ''
            else if (['taille', 'size', 'pointure'].includes(label)) size = opt.value || ''
          }
        }

        // Catégorie
        let productType = ''
        if (product.collection?.title) {
          productType = product.collection.title
        } else if (product.categories?.length > 0) {
          productType = product.categories.map((c: any) => c.name).join(' > ')
        }

        const itemXml = `    <item>
      <g:id>${escapeXml(variant.id)}</g:id>
      <g:title>${escapeXml(title.substring(0, 150))}</g:title>
      <g:description>${escapeXml((product.description || product.title || '').substring(0, 5000))}</g:description>
      <g:link>${escapeXml(`${STORE_URL}/products/${product.handle}`)}</g:link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>${additionalImages.map(url => `
      <g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`).join('')}
      <g:price>${amount.toFixed(2)} EUR</g:price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>${variant.barcode ? `
      <g:gtin>${escapeXml(variant.barcode)}</g:gtin>` : `
      <g:mpn>${escapeXml(variant.sku || variant.id)}</g:mpn>
      <g:identifier_exists>no</g:identifier_exists>`}${hasMultipleVariants ? `
      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>` : ''}${color ? `
      <g:color>${escapeXml(color)}</g:color>` : ''}${size ? `
      <g:size>${escapeXml(size)}</g:size>` : ''}${productType ? `
      <g:product_type>${escapeXml(productType)}</g:product_type>` : ''}
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
    res.setHeader('Cache-Control', 'public, max-age=3600') // Cache 1h
    return res.status(200).send(xml)
  } catch (error: any) {
    console.error('❌ [GoogleFeed] Erreur génération XML:', error.message)
    return res.status(500).json({ success: false, message: error.message })
  }
}
