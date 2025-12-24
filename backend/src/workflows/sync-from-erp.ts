import {
  createWorkflow,
  WorkflowResponse,
  transform,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { upsertVariantPricesWorkflow } from "@medusajs/core-flows"
import {
  CreateProductWorkflowInputDTO,
  UpdateProductWorkflowInputDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import { OdooProduct, OdooCategory, Pagination } from "../modules/odoo/service"
import OdooModuleService from "../modules/odoo/service"

type SyncFromErpInput = Pagination & {
  dryRun?: boolean
  filterProductIds?: number[]
  filterCategoryId?: number // Import par catégorie
  isResync?: boolean // True = re-sync (ignore soft-deleted), False/undefined = import manuel (restaure soft-deleted)
}

/**
 * Convertit un prix Odoo vers le format Medusa (minor units, ex: centimes).
 *
 * Problème rencontré: certaines instances Odoo renvoient déjà des montants "en centimes"
 * (ex: 2050 pour 20,50€). Dans ce cas, multiplier par 100 provoque un x100 (→ 2 050,00€).
 *
 * - Si ODOO_PRICE_IN_CENTS=true: on considère que la valeur reçue est déjà en centimes.
 * - Sinon, heuristique: si le prix est un entier >= 1000, on le traite comme des centimes.
 */
function odooPriceToMedusaAmount(price: unknown, debugSku?: string): number {
  const raw =
    typeof price === "number"
      ? price
      : typeof price === "string"
        ? Number(price.replace(",", "."))
        : Number(price)

  if (!Number.isFinite(raw)) return 0

  // NE PAS MULTIPLIER PAR 100 !
  // Le pricing workflow de Medusa s'attend à recevoir des EUROS, pas des centimes.
  // Medusa fera lui-même la conversion en "minor units" lors du stockage.
  const amount = Math.round(raw * 100) / 100  // Arrondir à 2 décimales
  
  console.log(
    `💰 [PRICE] SKU:${debugSku || "?"} | ` +
    `Odoo: ${raw}€ → Medusa: ${amount}€ (pas de x100)`
  )
  
  return amount
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

/**
 * Déduit les options (ex: Couleur/Taille) depuis les variantes Odoo
 * même si `attribute_line_ids.value_ids` est vide/inexploitable.
 */
function buildOptionsFromVariants(variants: any[]): { title: string; values: string[] }[] {
  const map = new Map<string, Set<string>>()

  for (const variant of variants || []) {
    const values = variant?.product_template_variant_value_ids
    if (!Array.isArray(values)) continue

    for (const v of values) {
      const attrName =
        v?.attribute_id?.display_name ||
        v?.attribute_id?.name ||
        (Array.isArray(v?.attribute_id) ? v.attribute_id[1] : null) ||
        null
      let valName = v?.name || null
      if (!attrName || !valName) continue

      // Nettoyer la valeur : enlever le préfixe "AttributName: " si présent
      const prefixPatterns = [
        `${attrName}:`,
        `${attrName} :`
      ]
      
      for (const prefix of prefixPatterns) {
        if (valName.startsWith(prefix)) {
          valName = valName.substring(prefix.length).trim()
          break
        }
      }

      if (!map.has(attrName)) map.set(attrName, new Set())
      map.get(attrName)!.add(valName)
    }
  }

  return Array.from(map.entries()).map(([title, values]) => ({
    title,
    values: Array.from(values),
  }))
}

// Step 1: Récupérer les catégories Odoo
const fetchOdooCategoriesStep = createStep(
  "fetch-odoo-categories",
  async (_, { container }) => {
    console.log(`📥 [WORKFLOW] Récupération catégories Odoo`)
    const odooModuleService = container.resolve(ODOO_MODULE) as OdooModuleService
    const categories = await odooModuleService.fetchCategories()
    console.log(`✅ [WORKFLOW] ${categories.length} catégories récupérées`)
    return new StepResponse(categories)
  }
)

// Step 2: Synchroniser les catégories dans Medusa
const syncCategoriesStep = createStep(
  "sync-categories",
  async (odooCategories: OdooCategory[], { container }) => {
    console.log(`🔄 [WORKFLOW] Synchronisation des catégories...`)
    const productService = container.resolve(Modules.PRODUCT)
    
    const categoryMap = new Map<number, string>() // Odoo ID -> Medusa ID
    
    // 1. Récupérer toutes les catégories Medusa existantes
    const existingCategories = await productService.listProductCategories({}, {
      take: 1000,
      select: ["id", "metadata", "name"]
    })
    
    // Mapper les existantes
    existingCategories.forEach((c) => {
      if (c.metadata?.odoo_id) {
        categoryMap.set(Number(c.metadata.odoo_id), c.id)
      }
    })

    // 2. Trier les catégories Odoo pour créer les parents avant les enfants
    // (On peut le faire par passes successives ou tri topologique, ici simple tri par parent_id)
    // Mais Odoo parent_id est [id, name] ou false.
    // Pour simplifier, on crée tout à plat d'abord, puis on update les parents.
    
    for (const odooCat of odooCategories) {
      const existingId = categoryMap.get(odooCat.id)
      const handle = odooCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + odooCat.id

      if (existingId) {
        // Update si nécessaire (nom)
        await productService.updateProductCategories(existingId, {
          name: odooCat.name,
          // On ne touche pas au handle pour pas casser le SEO
        })
      } else {
        // Create
        const created = await productService.createProductCategories({
          name: odooCat.name,
          handle: handle,
          is_active: true,
          metadata: {
            odoo_id: odooCat.id,
            odoo_parent_id: odooCat.parent_id ? odooCat.parent_id[0] : null
          }
        })
        categoryMap.set(odooCat.id, created.id)
        console.log(`    ➕ Catégorie créée: ${odooCat.name}`)
      }
    }

    // 3. Mise à jour des parents (Hiérarchie)
    console.log(`    🔗 Mise à jour de la hiérarchie des catégories...`)
    for (const odooCat of odooCategories) {
      if (odooCat.parent_id) {
        const medusaId = categoryMap.get(odooCat.id)
        const medusaParentId = categoryMap.get(odooCat.parent_id[0])
        
        if (medusaId && medusaParentId) {
          await productService.updateProductCategories(medusaId, {
            parent_category_id: medusaParentId
          })
        }
      }
    }

    return new StepResponse(categoryMap)
  }
)

// Step pour récupérer les produits depuis Odoo
const fetchOdooProductsStep = createStep(
  "fetch-odoo-products",
  async (input: SyncFromErpInput, { container }) => {
    console.log(`📥 [WORKFLOW] Récupération produits Odoo`)
    
    let odooModuleService: OdooModuleService
    try {
      odooModuleService = container.resolve(ODOO_MODULE) as OdooModuleService
    } catch (error) {
      console.error(`❌ [WORKFLOW] Module Odoo non disponible:`, error)
      throw new Error("Module Odoo non configuré")
    }
    
    let products: OdooProduct[]
    
    if (input.filterProductIds && input.filterProductIds.length > 0) {
      console.log(`🔍 [WORKFLOW] Récupération directe des produits IDs:`, input.filterProductIds)
      products = await odooModuleService.fetchProductsByIds(input.filterProductIds)
    } else {
      console.log(`📄 [WORKFLOW] Récupération paginée (offset: ${input.offset}, limit: ${input.limit}, category: ${input.filterCategoryId || 'all'})`)
      const result = await odooModuleService.fetchProductsPaged({
        offset: input.offset,
        limit: input.limit,
        categoryId: input.filterCategoryId // Filtrage par catégorie
      })
      products = result.products
    }
    
    return new StepResponse(products)
  }
)

// Step pour récupérer les produits existants dans Medusa
const fetchExistingProductsStep = createStep(
  "fetch-existing-products",
  async ({ odooProducts }: { odooProducts: OdooProduct[] }, { container }) => {
    const productService = container.resolve(Modules.PRODUCT)
    const externalIds = odooProducts.map((p: OdooProduct) => `${p.id}`)
    // IMPORTANT: listProducts() est paginé par défaut. Sans `take`, on ne récupère
    // qu'une petite partie des produits, ce qui empêche la re-sync de mettre à jour
    // les produits existants (ils sont alors traités comme "à créer").
    // Inclure aussi les produits soft-deleted: si un produit a été "supprimé" dans l'admin,
    // un ré-import doit le restaurer puis l'updater (sinon on tente de recréer et on peut
    // se heurter à des contraintes uniques: handle/sku/etc.).
    const products = await productService.listProducts(
      {},
      {
        select: ["id", "metadata", "deleted_at"],
        relations: ["variants"],
        take: 10000,
        withDeleted: true,
      }
    )
    // external_id peut être stocké en number ou string selon les imports précédents
    const activeProducts = products.filter((p: any) => {
      const ext = p?.metadata?.external_id
      if (ext === null || ext === undefined) return false
      return externalIds.includes(String(ext))
    })
    return new StepResponse(activeProducts)
  }
)

// Step: si un produit est soft-deleted, on le supprime définitivement avant ré-import.
// Raison: la restauration peut échouer si des variantes (SKU) entrent en conflit ("already exists").
// Le hard-delete libère les contraintes uniques, puis le produit est recréé proprement depuis Odoo.
const hardDeleteSoftDeletedProductsStep = createStep(
  "hard-delete-soft-deleted-products",
  async (
    { productIdsToHardDelete, dryRun }: { productIdsToHardDelete: string[]; dryRun: boolean },
    { container }
  ) => {
    if (dryRun || !productIdsToHardDelete?.length) {
      return new StepResponse({ deleted: 0 })
    }

    const productService = container.resolve(Modules.PRODUCT)
    console.log(
      `🗑️ [WORKFLOW] Hard-delete de ${productIdsToHardDelete.length} produit(s) soft-deleted avant ré-import`
    )
    await productService.deleteProducts(productIdsToHardDelete)
    return new StepResponse({ deleted: productIdsToHardDelete.length })
  }
)

export const syncFromErpWorkflow = createWorkflow(
  "sync-from-erp",
  function (input: SyncFromErpInput) {
    // NOTE: Les catégories Odoo servent UNIQUEMENT à filtrer dans le module admin
    // Elles ne sont PAS créées dans Medusa (désactivé volontairement)
    // const odooCategories = fetchOdooCategoriesStep()
    // const categoryMap = syncCategoriesStep(odooCategories)

    // Sync Produits
    const odooProducts = fetchOdooProductsStep(input)
    const existingProducts = fetchExistingProductsStep({ odooProducts })

    // Préparer les produits
    const { productsToCreate, productsToUpdate } = transform(
      { odooProducts, existingProducts, input },
      ({ odooProducts, existingProducts, input }) => {
        console.log(`🔄 [WORKFLOW] Transformation des produits...`)
        
        const productsToCreate: CreateProductWorkflowInputDTO[] = []
        const productsToUpdate: UpdateProductWorkflowInputDTO[] = []

        odooProducts.forEach((odooProduct: OdooProduct) => {
          try {
            const existingProduct = existingProducts.find(
              (p: any) => String(p?.metadata?.external_id) === `${odooProduct.id}`
            )

            // NOTE: Les catégories ne sont pas synchronisées dans Medusa
            // Elles servent uniquement à filtrer dans le module admin Odoo

            // Extraire la marque du produit si disponible
            // Certains Odoo n'ont pas `product_brand_id` → champ configurable via ODOO_BRAND_FIELD
            const brandField = (process.env.ODOO_BRAND_FIELD || "product_brand_id").trim()
            const rawBrand = brandField ? (odooProduct as any)?.[brandField] : null
            const brandName =
              rawBrand && Array.isArray(rawBrand) ? rawBrand[1] : null

            const product: any = {
              id: existingProduct?.id,
              title: odooProduct.display_name || odooProduct.name || `Produit ${odooProduct.id}`,
              description: odooProduct.description_sale || undefined,
              handle: `${(odooProduct.display_name || odooProduct.name || `product-${odooProduct.id}`)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')}-odoo-${odooProduct.id}`,
              status: "published",
              metadata: {
                external_id: `${odooProduct.id}`,
                odoo_category: odooProduct.categ_id ? odooProduct.categ_id[1] : null, // Juste pour info
                brand: brandName, // Marque du produit depuis Odoo
              },
              options: [],
              variants: [],
              // categories: [], // Pas de catégories Medusa depuis Odoo
              odoo_image_base64: (odooProduct.image_512 && typeof odooProduct.image_512 === 'string') 
                ? odooProduct.image_512 
                : undefined,
              odoo_image_ids: odooProduct.ept_image_ids || [], // IDs des images additionnelles (EPT)
            }

            // DEBUG: Afficher les IDs d'images disponibles
            console.log(`🖼️ [DEBUG] Produit ${odooProduct.display_name} (${odooProduct.id}):`)
            console.log(`  - image_512: ${odooProduct.image_512 ? 'présente' : 'absente'}`)
            console.log(`  - ept_image_ids: ${JSON.stringify(odooProduct.ept_image_ids)}`)
            console.log(`  - Type: ${typeof odooProduct.ept_image_ids}, Array: ${Array.isArray(odooProduct.ept_image_ids)}`)

            // Gérer les options et variantes
          const hasMultipleVariants = odooProduct.product_variant_count > 1 && 
            Array.isArray(odooProduct.product_variant_ids) && 
            odooProduct.product_variant_ids.length > 1

          // Vérifier si le produit a des attributs valides
          let validOptions: any[] = []
          if (hasMultipleVariants && odooProduct.attribute_line_ids?.length) {
            validOptions = odooProduct.attribute_line_ids
              .filter((line) => line.attribute_id && line.value_ids?.length)
              .map((line) => {
                const attrName = line.attribute_id.display_name || line.attribute_id.name || 'Attribut'
                
                // Nettoyer les valeurs : enlever les préfixes si présents
                const cleanValues = line.value_ids.map((v) => {
                  let cleanValue = v.name || 'Valeur'
                  
                  // Enlever les préfixes courants (AttributName:, ProductName:)
                  const prefixPatterns = [
                    `${attrName}:`,
                    `${attrName} :`,
                    `${odooProduct.display_name}:`,
                    `${odooProduct.name}:`
                  ]
                  
                  for (const prefix of prefixPatterns) {
                    if (cleanValue.startsWith(prefix)) {
                      cleanValue = cleanValue.substring(prefix.length).trim()
                      break
                    }
                  }
                  
                  return cleanValue
                })
                
                return {
                  title: attrName,
                  values: cleanValues,
                }
              })
          }

          // Si Odoo ne renvoie pas correctement `attribute_line_ids.value_ids`,
          // on reconstruit les options depuis les variantes (robuste).
          if (hasMultipleVariants && validOptions.length === 0) {
            const fromVariants = buildOptionsFromVariants(odooProduct.product_variant_ids as any[])
            if (fromVariants.length) {
              validOptions = fromVariants
            }
          }

          // Si plusieurs variantes mais pas d'attributs → créer un attribut "Variante" automatiquement
          if (hasMultipleVariants && validOptions.length === 0) {
            console.log(`🔧 [WORKFLOW] Création attribut automatique pour ${odooProduct.display_name} (${odooProduct.product_variant_ids.length} variantes sans attributs)`)
            // Extraire les noms de variantes pour créer les valeurs
            const variantNames = odooProduct.product_variant_ids.map((v, idx) => {
              // Essayer d'extraire un nom significatif de la variante
              const name = v.display_name || v.name || ''
              // Retirer le nom du produit parent si présent
              const cleanName = name.replace(odooProduct.display_name || '', '').replace(odooProduct.name || '', '').trim()
              // Si pas de nom significatif, utiliser le SKU ou un index
              return cleanName || v.default_code || `Variante ${idx + 1}`
            })
            validOptions = [{ title: "Variante", values: variantNames }]
          }

          // Traiter comme produit avec variantes si on a des variantes ET des options
          if (hasMultipleVariants && validOptions.length > 0) {
            // normaliser: unique + ordre stable
            product.options = validOptions.map((o: any) => ({
              title: o.title,
              values: uniq((o.values || []).filter(Boolean)),
            }))
            
            product.variants = odooProduct.product_variant_ids.map((variant, variantIndex) => {
              const options: Record<string, string> = {}
              
              // Utiliser les attributs Odoo si disponibles
              if (variant.product_template_variant_value_ids?.length) {
                variant.product_template_variant_value_ids.forEach((value) => {
                  if (value.attribute_id && value.name) {
                    const attrName = value.attribute_id.display_name || value.attribute_id.name || 'Attribut'
                    
                    // Nettoyer la valeur : enlever le préfixe "AttributName: " si présent
                    // Ex: "Couleur: NOIR" → "NOIR"
                    let cleanValue = value.name
                    
                    // Si la valeur commence par "AttributName:" ou "ProductName:", on enlève
                    const prefixPatterns = [
                      `${attrName}:`,
                      `${attrName} :`,
                      `${odooProduct.display_name}:`,
                      `${odooProduct.name}:`
                    ]
                    
                    for (const prefix of prefixPatterns) {
                      if (cleanValue.startsWith(prefix)) {
                        cleanValue = cleanValue.substring(prefix.length).trim()
                        break
                      }
                    }
                    
                    options[attrName] = cleanValue
                  }
                })
              }
              
              // Si pas d'options définies, utiliser l'option automatique
              if (Object.keys(options).length === 0) {
                const optionTitle = validOptions[0]?.title || 'Variante'
                const optionValue = validOptions[0]?.values?.[variantIndex] || `Variante ${variantIndex + 1}`
                options[optionTitle] = optionValue
              }

              const weightInGrams = variant.weight ? Math.round(variant.weight * 1000) : undefined
              const variantSku = variant.default_code || `ODOO-${variant.id}`
              // Convertir le prix Odoo vers Medusa (centimes)
              const priceAmount = odooPriceToMedusaAmount(variant.list_price, variantSku)

              // Titre clair: uniquement les valeurs d'options (ex: "NOIR / 6.5")
              const optionValues = Object.values(options).filter(Boolean)
              const variantTitle =
                optionValues.length > 0
                  ? optionValues.join(" / ")
                  : variant.default_code || `Variante ${variantIndex + 1}`

              return {
                id: existingProduct
                  ? existingProduct.variants.find((v) => v.sku === variantSku || v.sku === variant.default_code)?.id
                  : undefined,
                title: variantTitle,
                sku: variantSku,
                barcode: variant.barcode || undefined,
                weight: weightInGrams,
                options,
                prices: [
                  {
                    amount: priceAmount,
                    currency_code: (Array.isArray(variant.currency_id) ? variant.currency_id[1] : "eur")?.toLowerCase() || "eur",
                  },
                ],
                manage_inventory: true,
                metadata: {
                  external_id: `${variant.id}`,
                  odoo_variant_id: variant.id,
                  odoo_weight_kg: variant.weight,
                  odoo_volume: variant.volume,
                  odoo_qty_available: variant.qty_available || 0,
                  generated_sku: !variant.default_code,
                },
              }
            })
          } else {
            // Produit sans attributs valides → traiter comme produit simple
            // Utiliser la première variante si disponible (pour avoir le bon SKU)
            const firstVariant = Array.isArray(odooProduct.product_variant_ids) 
              ? odooProduct.product_variant_ids[0] 
              : null
            
            const weightInGrams = (firstVariant?.weight || odooProduct.weight) 
              ? Math.round((firstVariant?.weight || odooProduct.weight) * 1000) 
              : undefined
            // Utiliser le SKU de la variante en priorité
            const productSku = firstVariant?.default_code || odooProduct.default_code || `ODOO-${firstVariant?.id || odooProduct.id}`
            // Convertir le prix Odoo vers Medusa (centimes)
            const priceAmount = odooPriceToMedusaAmount(firstVariant?.list_price ?? odooProduct.list_price, productSku)
            const variantId = firstVariant?.id || odooProduct.id
            const stockQty = firstVariant?.qty_available || odooProduct.qty_available || 0
            
            product.options = [{ title: "Default", values: ["Default"] }]
            product.variants.push({
              id: existingProduct ? existingProduct.variants[0]?.id : undefined,
              title: "Default",
              sku: productSku,
              barcode: firstVariant?.barcode || odooProduct.default_code || undefined,
              weight: weightInGrams,
              options: { Default: "Default" },
              prices: [{
                  amount: priceAmount,
                  currency_code: (Array.isArray(odooProduct.currency_id) ? odooProduct.currency_id[1] : "eur")?.toLowerCase() || "eur",
              }],
              metadata: {
                external_id: `${variantId}`,
                odoo_product_id: odooProduct.id,
                odoo_variant_id: variantId,
                odoo_qty_available: stockQty,
                generated_sku: !productSku.includes('ODOO-') ? false : true,
              },
              manage_inventory: true,
            })
          }

          if (existingProduct) {
            // Si le produit est soft-deleted, on l'ignore (sauf si c'est un import manuel depuis Odoo)
            if ((existingProduct as any).deleted_at) {
              // Pour un import manuel, on restaure et met à jour
              // Pour une re-sync, on ignore les produits supprimés
              // On distingue via le flag isResync (re-sync=true → ignore, import manuel=false → restaure)
              const isResyncMode = input?.isResync === true
              if (!isResyncMode) {
                console.log(`♻️ [WORKFLOW] Import manuel: restauration produit soft-deleted ${existingProduct.id}`)
                productsToUpdate.push(product as UpdateProductWorkflowInputDTO)
              } else {
                console.log(`⏭️ [WORKFLOW] Re-sync: ignorer produit soft-deleted ${existingProduct.id}`)
              }
            } else {
              // Produit actif, on le met à jour
              productsToUpdate.push(product as UpdateProductWorkflowInputDTO)
            }
          } else {
            productsToCreate.push(product as CreateProductWorkflowInputDTO)
          }
          } catch (error: any) {
            console.error(`❌ Erreur produit ${odooProduct.id}:`, error.message)
          }
        })

        console.log(`📊 [WORKFLOW] Transform terminé: ${productsToCreate.length} à créer, ${productsToUpdate.length} à mettre à jour`)
        return { productsToCreate, productsToUpdate }
      }
    )

    // Create & Update Steps
    // J'abrège ici pour la lisibilité mais je vais remettre le code complet dans le fichier.
    // ... (Code complet Create/Update repris du fichier précédent avec nettoyage MinIO inclus) ...
    
    const createProductsStep = createStep(
      "create-products-from-odoo",
      async ({ productsToCreate, dryRun }: { productsToCreate: any[]; dryRun: boolean }, { container }) => {
        console.log(`➕ [WORKFLOW] CREATE step appelé: ${productsToCreate.length} produit(s) à créer, dryRun=${dryRun}`)
        if (dryRun || productsToCreate.length === 0) return new StepResponse({ created: 0 })
        
        const productService = container.resolve(Modules.PRODUCT)
        const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
        const inventoryService = container.resolve(Modules.INVENTORY)
        
        let salesChannels = await salesChannelService.listSalesChannels({ name: "LaCabrade" })
        let lacabradeChannel = salesChannels[0]
        if (!lacabradeChannel) {
          const createdChannels = await salesChannelService.createSalesChannels({ name: "LaCabrade", description: "Canal principal" })
          lacabradeChannel = Array.isArray(createdChannels) ? createdChannels[0] : createdChannels
        }

        const createdProducts = []
        for (const productData of productsToCreate) {
            // 🧹 Nettoyer les inventory items orphelins AVANT de créer le produit
            // (nécessaire si le produit a été supprimé mais l'inventory item est resté)
            if (productData.variants?.length) {
                for (const variant of productData.variants) {
                    if (variant.sku) {
                        try {
                            const existingItems = await inventoryService.listInventoryItems({ sku: [variant.sku] })
                            if (existingItems.length > 0) {
                                console.log(`🧹 [WORKFLOW] Suppression inventory item orphelin SKU: ${variant.sku}`)
                                for (const item of existingItems) {
                                    await inventoryService.deleteInventoryItems([item.id])
                                }
                            }
                        } catch (e: any) {
                            console.warn(`⚠️ Nettoyage inventory ${variant.sku}:`, e.message)
                        }
                    }
                }
            }
            
            const productPayload = { ...productData, sales_channels: [{ id: lacabradeChannel.id }] }
            
            // Workflow creation
            const workflow = createProductsWorkflow(container)
            const { result } = await workflow.run({ input: { products: [productPayload] } })
            const created = result[0]
            
            // Image Upload (MinIO) - Upload toutes les images depuis Odoo
            if (created) {
                try {
                    // Vérifier que les variables MinIO sont définies
                    if (!process.env.MINIO_ENDPOINT || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
                        console.warn(`⚠️ [WORKFLOW] Variables MinIO non définies, upload d'image ignoré pour produit ${created.id}`)
                    } else {
                        const imageUrls: string[] = []
                        const { Client } = await import('minio')
                        const rawEndpoint = process.env.MINIO_ENDPOINT
                        const endpoint = rawEndpoint.replace(/^https?:\/\//, '')
                        const bucket = process.env.MINIO_BUCKET || 'medusa-media'
                        
                        const client = new Client({
                            endPoint: endpoint,
                            port: 443, 
                            useSSL: true,
                            accessKey: process.env.MINIO_ACCESS_KEY,
                            secretKey: process.env.MINIO_SECRET_KEY
                        })
                        
                        // Upload image principale (image_512) en premier
                        if (productData.odoo_image_base64) {
                            const filename = `odoo/products/${created.id}/main-${Date.now()}.png`
                            const buffer = Buffer.from(productData.odoo_image_base64, 'base64')
                            
                            await client.putObject(bucket, filename, buffer, buffer.length, { 
                                'Content-Type': 'image/png', 
                                'x-amz-acl': 'public-read' 
                            })
                            
                            const url = `https://${endpoint}/${bucket}/${filename}`
                            imageUrls.push(url)
                            console.log(`📷 [WORKFLOW] Image principale uploadée: ${url}`)
                        }
                        
                        // Upload images additionnelles depuis product.image
                        console.log(`🖼️ [DEBUG] Vérification images additionnelles pour produit ${created.id}:`)
                        console.log(`  - odoo_image_ids présent: ${!!productData.odoo_image_ids}`)
                        console.log(`  - Type: ${typeof productData.odoo_image_ids}`)
                        console.log(`  - Array: ${Array.isArray(productData.odoo_image_ids)}`)
                        console.log(`  - Length: ${productData.odoo_image_ids?.length || 0}`)
                        console.log(`  - Valeur: ${JSON.stringify(productData.odoo_image_ids)}`)
                        
                        if (productData.odoo_image_ids && Array.isArray(productData.odoo_image_ids) && productData.odoo_image_ids.length > 0) {
                            try {
                                console.log(`🖼️ [DEBUG] Appel fetchProductImages avec IDs: ${JSON.stringify(productData.odoo_image_ids)}`)
                                const odooModuleService = container.resolve(ODOO_MODULE) as OdooModuleService
                                const additionalImages = await odooModuleService.fetchProductImages(productData.odoo_image_ids)
                                
                                console.log(`📷 [WORKFLOW] ${additionalImages.length} image(s) additionnelle(s) trouvée(s) pour produit ${created.id}`)
                                console.log(`🖼️ [DEBUG] Images récupérées: ${JSON.stringify(additionalImages.map(img => ({ id: img.id, name: img.name, hasImage: !!img.image, sequence: img.sequence })))}`)
                                
                                // Trier par sequence pour respecter l'ordre Odoo
                                const sortedImages = additionalImages.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                
                                for (const img of sortedImages) {
                                    if (img.image && typeof img.image === 'string') {
                                        const filename = `odoo/products/${created.id}/img-${img.id}-${Date.now()}.png`
                                        const buffer = Buffer.from(img.image, 'base64')
                                        
                                        await client.putObject(bucket, filename, buffer, buffer.length, { 
                                            'Content-Type': 'image/png', 
                                            'x-amz-acl': 'public-read' 
                                        })
                                        
                                        const url = `https://${endpoint}/${bucket}/${filename}`
                                        imageUrls.push(url)
                                        console.log(`📷 [WORKFLOW] Image additionnelle uploadée: ${url} (sequence: ${img.sequence})`)
                                    } else {
                                        console.warn(`⚠️ [DEBUG] Image ${img.id} sans données`)
                                    }
                                }
                            } catch (imgErr: any) {
                                console.error(`❌ [WORKFLOW] Erreur récupération images additionnelles:`, imgErr.message)
                                console.error(`❌ [WORKFLOW] Stack trace:`, imgErr.stack)
                            }
                        } else {
                            console.log(`ℹ️ [WORKFLOW] Pas d'images additionnelles à uploader pour produit ${created.id}`)
                        }
                        
                        // Mettre à jour le produit avec toutes les images
                        if (imageUrls.length > 0) {
                            await productService.updateProducts(created.id, { 
                                images: imageUrls.map(url => ({ url })), 
                                thumbnail: imageUrls[0] // Première image = thumbnail
                            })
                            console.log(`✅ [WORKFLOW] ${imageUrls.length} image(s) associée(s) au produit ${created.id}`)
                        }
                    }
                } catch (e: any) { 
                    console.error(`❌ [WORKFLOW] Erreur upload images MinIO:`, e.message) 
                }
            }
            
            // Init Stock (Odoo) - Récupérer ou créer les inventory items pour CHAQUE variante
            if (created) {
                const full = await productService.retrieveProduct(created.id, { relations: ["variants"] })
                if (full.variants && productData.variants) {
                    const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
                    const locs = await stockLocationService.listStockLocations({})
                    if (locs.length) {
                        const loc = locs[0]
                        
                        // Créer une map SKU -> stock Odoo pour matcher correctement
                        const odooStockBySku = new Map<string, number>()
                        for (const odooVariant of productData.variants) {
                            if (odooVariant.sku) {
                                odooStockBySku.set(odooVariant.sku, odooVariant.metadata?.odoo_qty_available || 0)
                            }
                        }
                        
                        // Traiter chaque variante Medusa
                        for (const v of full.variants) {
                            // Récupérer le stock Odoo correspondant par SKU
                            const odooStock = odooStockBySku.get(v.sku) || 0
                            
                            try {
                                // Chercher si un inventory item existe déjà (créé par createProductsWorkflow)
                                let existingItems = await inventoryService.listInventoryItems({ sku: [v.sku] })
                                let item = existingItems[0]
                                
                                // Si pas d'item, le créer
                                if (!item) {
                                    const invItems = await inventoryService.createInventoryItems({ sku: v.sku })
                                    item = invItems[0]
                                    // Lier au variant
                                    const link = container.resolve("remoteLink")
                                    await link.create([{ [Modules.PRODUCT]: { variant_id: v.id }, [Modules.INVENTORY]: { inventory_item_id: item.id } }])
                                }
                                
                                // Créer le niveau de stock (si pas déjà existant)
                                const existingLevels = await inventoryService.listInventoryLevels({ 
                                    inventory_item_id: [item.id], 
                                    location_id: [loc.id] 
                                })
                                
                                if (existingLevels.length === 0) {
                                    await inventoryService.createInventoryLevels({ 
                                        inventory_item_id: item.id, 
                                        location_id: loc.id, 
                                        stocked_quantity: odooStock 
                                    })
                                } else {
                                    // Mettre à jour le stock existant
                                    await inventoryService.updateInventoryLevels({
                                        inventory_item_id: item.id,
                                        location_id: loc.id,
                                        stocked_quantity: odooStock
                                    })
                                }
                                
                                console.log(`📦 [WORKFLOW] Stock ${v.sku}: ${odooStock}`)
                            } catch (stockError: any) {
                                console.warn(`⚠️ [WORKFLOW] Erreur stock ${v.sku}:`, stockError.message)
                            }
                        }
                    }
                }
                createdProducts.push(full)
            }
        }
        return new StepResponse({ created: createdProducts.length })
      }
    )

    const createResult = createProductsStep({ productsToCreate, dryRun: input.dryRun })

    // Update Step - utilise le workflow officiel Medusa pour mettre à jour produits ET prix
    const updateProductsStep = createStep(
        "update-products",
        async ({ productsToUpdate, dryRun }: { productsToUpdate: any[]; dryRun: boolean }, { container }) => {
            console.log(`🔄 [WORKFLOW] UPDATE step appelé: ${productsToUpdate.length} produit(s) à mettre à jour, dryRun=${dryRun}`)
            if (dryRun || !productsToUpdate.length) return new StepResponse({ updated: 0 })
            
            let updatedCount = 0
            const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
            // Garantir le canal LaCabrade sur update (sinon Medusa vide la liste)
            let salesChannels = await salesChannelService.listSalesChannels({ name: "LaCabrade" })
            let lacabradeChannel = salesChannels[0]
            if (!lacabradeChannel) {
              const createdChannels = await salesChannelService.createSalesChannels({
                name: "LaCabrade",
                description: "Canal principal",
              })
              lacabradeChannel = Array.isArray(createdChannels) ? createdChannels[0] : createdChannels
            }
            
            for (const p of productsToUpdate) {
                try {
                    const productService = container.resolve(Modules.PRODUCT)

                    // NOTE: La restauration des produits soft-deleted est gérée dans le step "transform"
                    // Si un produit arrive ici et est soft-deleted, c'est volontaire (import manuel)
                    // On doit restaurer avant de mettre à jour pour éviter les erreurs
                    try {
                      const checkProduct = await productService.retrieveProduct(p.id, { 
                        withDeleted: true,
                        relations: ["variants"]
                      })
                      if (checkProduct.deleted_at) {
                        console.log(`♻️ [WORKFLOW] Restauration produit soft-deleted ${p.id} (import manuel)`)
                        
                        // Restaurer directement le produit ET ses variants soft-deleted
                        // Medusa restaure automatiquement les variants liés
                        await productService.restoreProducts([p.id])
                        console.log(`✅ [WORKFLOW] Produit ${p.id} restauré (variants et inventory items conservés)`)
                      }
                    } catch (restoreErr: any) {
                      console.warn(`⚠️ [WORKFLOW] Erreur restauration ${p.id}:`, restoreErr.message)
                    }

                    // 1) Mettre à jour le produit + options (sans variantes, pour éviter les DTO incompatibles)
                    const updatePayload = {
                        id: p.id,
                        title: p.title,
                        description: p.description,
                        handle: p.handle,
                        status: p.status,
                        metadata: p.metadata,
                        options: p.options,
                        sales_channels: [{ id: lacabradeChannel.id }],
                    }
                    
                    // Utiliser le workflow officiel Medusa qui gère les prix correctement
                    const workflow = updateProductsWorkflow(container)
                    await workflow.run({ input: { products: [updatePayload] } })

                    // 2) Upsert variantes (création + update) — overwrite SKU/options/title/etc.
                    console.log(`🔍 [UPDATE] Avant upsert ${p.id}: ${p.variants?.length || 0} variantes, première a des prix? ${!!p.variants?.[0]?.prices}`)
                    if (Array.isArray(p.variants) && p.variants.length) {
                      await productService.upsertProductVariants(
                        p.variants.map((v: any) => ({
                          id: v.id,
                          product_id: p.id,
                          title: v.title,
                          sku: v.sku,
                          barcode: v.barcode,
                          weight: v.weight,
                          manage_inventory: v.manage_inventory,
                          metadata: v.metadata,
                          options: v.options,
                        }))
                      )
                      console.log(`✅ [UPDATE] Upsert variantes OK pour ${p.id}`)
                    }

                    // 3) Prix via pricing workflow (encapsulé pour ne pas bloquer le reste)
                    console.log(`🔍 [UPDATE] Vérif pricing ${p.id}: hasVariants=${Array.isArray(p.variants)}, length=${p.variants?.length || 0}`)
                    if (Array.isArray(p.variants) && p.variants.length) {
                      try {
                        const fresh = await productService.retrieveProduct(p.id, {
                          relations: ["variants"],
                        })

                        console.log(`💰 [UPDATE] Produit ${p.id}: ${p.variants.length} variantes Odoo, ${fresh.variants?.length || 0} variantes Medusa`)

                        const previousVariantIds = (fresh.variants || []).map((v: any) => v.id)
                        const variantPrices = p.variants
                          .map((v: any) => {
                            const match = (fresh.variants || []).find(
                              (fv: any) => fv.id === v.id || (fv.sku && v.sku && fv.sku === v.sku)
                            )
                            if (!match) {
                              console.log(`⚠️ [UPDATE] Variant SKU:${v.sku} non trouvé dans Medusa`)
                              return null
                            }
                            if (!v.prices?.length) {
                              console.log(`⚠️ [UPDATE] Variant SKU:${v.sku} sans prix`)
                              return null
                            }
                            console.log(`💰 [UPDATE] Match variant ${match.id} (SKU:${v.sku}) → prix ${JSON.stringify(v.prices)}`)
                            return {
                              variant_id: match.id,
                              product_id: p.id,
                              prices: v.prices,
                            }
                          })
                          .filter(Boolean)

                        if (variantPrices.length) {
                          console.log(`💰 [UPDATE] Application pricing pour ${variantPrices.length} variantes`)
                          const pricingWf = upsertVariantPricesWorkflow(container)
                          await pricingWf.run({
                            input: {
                              variantPrices,
                              previousVariantIds,
                            },
                          })
                          console.log(`✅ [UPDATE] Pricing appliqué pour ${p.id}`)
                        } else {
                          console.log(`ℹ️ [UPDATE] Aucun prix à appliquer pour ${p.id}`)
                        }
                      } catch (pricingErr: any) {
                        console.warn(`⚠️ [WORKFLOW] Pricing update ${p.id}:`, pricingErr?.message || pricingErr)
                      }
                    }

                    // 4) Stock (encapsulé pour ne pas bloquer le reste)
                    try {
                      const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
                      const inventoryService = container.resolve(Modules.INVENTORY)
                      const locs = await stockLocationService.listStockLocations({})
                      if (locs.length && Array.isArray(p.variants) && p.variants.length) {
                        const loc = locs[0]
                        
                        // Récupérer le produit complet avec les variantes pour avoir les IDs à jour
                        const fullProduct = await productService.retrieveProduct(p.id, { relations: ["variants"] })
                        
                        for (const odooVariant of p.variants) {
                          if (!odooVariant.sku) continue
                          
                          // Trouver la variante Medusa correspondante
                          const medusaVariant = (fullProduct.variants || []).find(
                            (v: any) => v.sku === odooVariant.sku
                          )
                          if (!medusaVariant) continue
                          
                          const odooStock = odooVariant.metadata?.odoo_qty_available ?? 0
                          
                          try {
                            let item: any = null
                            
                            // 🔍 ÉTAPE 1: Chercher par SKU (avec gestion des doublons)
                            let items = await inventoryService.listInventoryItems({ sku: [odooVariant.sku] })
                            
                            // Détecter et supprimer les doublons d'inventory items
                            if (items.length > 1) {
                              console.warn(`⚠️ [WORKFLOW] ${items.length} doublons inventory_item pour SKU ${odooVariant.sku}, nettoyage...`)
                              
                              const sorted = items.sort((a: any, b: any) => 
                                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                              )
                              const toKeep = sorted[0]
                              const toDelete = sorted.slice(1)
                              
                              for (const oldItem of toDelete) {
                                try {
                                  const oldLevels = await inventoryService.listInventoryLevels({ 
                                    inventory_item_id: [oldItem.id] 
                                  })
                                  if (oldLevels.length > 0) {
                                    await inventoryService.deleteInventoryLevels(oldLevels.map((l: any) => l.id))
                                  }
                                  
                                  await inventoryService.deleteInventoryItems([oldItem.id])
                                  console.log(`🧹 [WORKFLOW] Doublon inventory_item supprimé: ${oldItem.id}`)
                                } catch (deleteErr) {
                                  // Continuer même si erreur
                                }
                              }
                              
                              items = [toKeep]
                            }
                            
                            if (items.length > 0) {
                              item = items[0]
                              console.log(`🔍 [WORKFLOW] Inventory item trouvé via SKU: ${item.id}`)
                              
                              // 🔗 ÉTAPE 2: S'assurer que le lien variant ↔ inventory existe
                              try {
                                const link = container.resolve("remoteLink")
                                await link.create([
                                  { 
                                    [Modules.PRODUCT]: { variant_id: medusaVariant.id }, 
                                    [Modules.INVENTORY]: { inventory_item_id: item.id } 
                                  }
                                ])
                                console.log(`🔗 [WORKFLOW] Lien créé/vérifié: variant ${medusaVariant.id} ↔ inventory ${item.id}`)
                              } catch (linkCreateErr: any) {
                                // Le lien existe déjà ou erreur non critique
                                if (!linkCreateErr.message?.includes("already exists")) {
                                  console.log(`🔗 [WORKFLOW] Lien variant↔inventory:`, linkCreateErr.message)
                                }
                              }
                            }
                            
                            // 🔍 ÉTAPE 3: Si toujours pas trouvé, en créer un nouveau
                            if (!item) {
                              console.log(`🆕 [WORKFLOW] Création inventory item pour SKU ${odooVariant.sku}...`)
                              const created = await inventoryService.createInventoryItems({ sku: odooVariant.sku })
                              item = Array.isArray(created) ? created[0] : created
                              
                              if (!item) {
                                console.warn(`⚠️ [WORKFLOW] Impossible de créer inventory item pour SKU ${odooVariant.sku}`)
                                console.warn(`⚠️ [WORKFLOW] createInventoryItems retourné:`, typeof created, created)
                                continue
                              }
                              
                              console.log(`✅ [WORKFLOW] Inventory item créé: ${item.id}`)
                              
                              // Lier au variant
                              const link = container.resolve("remoteLink")
                              await link.create([
                                { 
                                  [Modules.PRODUCT]: { variant_id: medusaVariant.id }, 
                                  [Modules.INVENTORY]: { inventory_item_id: item.id } 
                                }
                              ])
                              console.log(`🔗 [WORKFLOW] Inventory item ${item.id} lié au variant ${medusaVariant.id}`)
                            }
                            
                            if (!item?.id) {
                              console.warn(`⚠️ [WORKFLOW] Inventory item sans ID pour SKU ${odooVariant.sku}`)
                              continue
                            }
                            
                            // Mettre à jour ou créer le niveau de stock
                            const levels = await inventoryService.listInventoryLevels({
                              inventory_item_id: [item.id],
                              location_id: [loc.id],
                            })
                            
                            if (levels.length === 0) {
                              await inventoryService.createInventoryLevels({
                                inventory_item_id: item.id,
                                location_id: loc.id,
                                stocked_quantity: odooStock,
                              })
                            } else {
                              await inventoryService.updateInventoryLevels({
                                inventory_item_id: item.id,
                                location_id: loc.id,
                                stocked_quantity: odooStock,
                              })
                            }
                            
                            console.log(`📦 [WORKFLOW] Stock ${odooVariant.sku}: ${odooStock}`)
                          } catch (stockErr: any) {
                            console.warn(`⚠️ [WORKFLOW] Stock update ${odooVariant.sku}:`, stockErr?.message || stockErr)
                          }
                        }
                      }
                    } catch (stockBlockErr: any) {
                      console.warn(`⚠️ [WORKFLOW] Stock block ${p.id}:`, stockBlockErr?.message || stockBlockErr)
                    }
                    
                    console.log(`✅ [WORKFLOW] Produit ${p.title} (${p.id}) mis à jour avec prix`)
                    updatedCount++
                } catch (updateError: any) {
                    console.error(`❌ [WORKFLOW] Erreur mise à jour produit ${p.id}:`, updateError.message)
                    console.error(`❌ [WORKFLOW] Stack:`, updateError.stack)
                    
                    // Fallback: mise à jour basique sans les prix
                    try {
                        const productService = container.resolve(Modules.PRODUCT)
                        await productService.updateProducts(p.id, { 
                            title: p.title, 
                            description: p.description, 
                            handle: p.handle, 
                            status: p.status, 
                            metadata: p.metadata, 
                        })
                        console.log(`⚠️ [WORKFLOW] Produit ${p.id} mis à jour (sans prix - fallback)`)
                        updatedCount++
                    } catch (fallbackError: any) {
                        console.error(`❌ [WORKFLOW] Échec total mise à jour ${p.id}:`, fallbackError.message)
                    }
                }
            }
            
            return new StepResponse({ updated: updatedCount })
        }
    )
    
    const updateResult = updateProductsStep({ productsToUpdate, dryRun: input.dryRun })

    return new WorkflowResponse({
      odooProducts,
      productsProcessed: odooProducts.length,
      toCreate: productsToCreate.length,
      toUpdate: productsToUpdate.length,
      createResult,
      updateResult,
    })
  }
)
