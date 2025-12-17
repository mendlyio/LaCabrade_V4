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
function odooPriceToMedusaAmount(price: unknown): number {
  const raw =
    typeof price === "number"
      ? price
      : typeof price === "string"
        ? Number(price.replace(",", "."))
        : Number(price)

  if (!Number.isFinite(raw)) return 0

  const flag = (process.env.ODOO_PRICE_IN_CENTS || "").toLowerCase()
  const priceIsInCents =
    flag === "true" ||
    flag === "1" ||
    // Heuristique "safe enough" pour des catalogues EUR classiques
    (Number.isInteger(raw) && raw >= 1000)

  return priceIsInCents ? Math.round(raw) : Math.round(raw * 100)
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

// Step: restaurer les produits soft-deleted avant de les mettre à jour
const restoreDeletedProductsStep = createStep(
  "restore-deleted-products",
  async (
    { productIdsToRestore, dryRun }: { productIdsToRestore: string[]; dryRun: boolean },
    { container }
  ) => {
    if (dryRun || !productIdsToRestore?.length) {
      return new StepResponse({ restored: 0 })
    }

    const productService = container.resolve(Modules.PRODUCT)
    console.log(
      `♻️ [WORKFLOW] Restauration de ${productIdsToRestore.length} produit(s) supprimé(s) (soft-delete)`
    )
    await productService.restoreProducts(productIdsToRestore)
    return new StepResponse({ restored: productIdsToRestore.length })
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
    const { productsToCreate, productsToUpdate, productIdsToRestore } = transform(
      { odooProducts, existingProducts },
      ({ odooProducts, existingProducts }) => {
        console.log(`🔄 [WORKFLOW] Transformation des produits...`)
        
        const productsToCreate: CreateProductWorkflowInputDTO[] = []
        const productsToUpdate: UpdateProductWorkflowInputDTO[] = []
        const productIdsToRestore: string[] = []

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
            }

            // Gérer les options et variantes
          const hasMultipleVariants = odooProduct.product_variant_count > 1 && 
            Array.isArray(odooProduct.product_variant_ids) && 
            odooProduct.product_variant_ids.length > 1

          // Vérifier si le produit a des attributs valides
          let validOptions: any[] = []
          if (hasMultipleVariants && odooProduct.attribute_line_ids?.length) {
            validOptions = odooProduct.attribute_line_ids
              .filter((line) => line.attribute_id && line.value_ids?.length)
              .map((line) => ({
                title: line.attribute_id.display_name || line.attribute_id.name || 'Attribut',
                values: line.value_ids.map((v) => v.name || 'Valeur'),
              }))
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
            product.options = validOptions
            
            product.variants = odooProduct.product_variant_ids.map((variant, variantIndex) => {
              const options: Record<string, string> = {}
              
              // Utiliser les attributs Odoo si disponibles
              if (variant.product_template_variant_value_ids?.length) {
                variant.product_template_variant_value_ids.forEach((value) => {
                  if (value.attribute_id && value.name) {
                    const attrName = value.attribute_id.display_name || value.attribute_id.name || 'Attribut'
                    options[attrName] = value.name
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
              // Convertir le prix Odoo vers Medusa (centimes)
              const priceAmount = odooPriceToMedusaAmount(variant.list_price)
              const variantSku = variant.default_code || `ODOO-${variant.id}`

              return {
                id: existingProduct 
                  ? existingProduct.variants.find((v) => v.sku === variantSku || v.sku === variant.default_code)?.id 
                  : undefined,
                title: (variant.display_name || variant.name || "Variante").replace(variant.default_code ? `[${variant.default_code}] ` : "", "").replace(odooProduct.display_name || '', '').trim() || `Variante ${variantIndex + 1}`,
                sku: variantSku,
                barcode: variant.barcode || undefined,
                weight: weightInGrams,
                options,
                prices: [{
                    amount: priceAmount,
                    currency_code: (Array.isArray(variant.currency_id) ? variant.currency_id[1] : "eur")?.toLowerCase() || "eur",
                }],
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
            // Convertir le prix Odoo vers Medusa (centimes)
            const priceAmount = odooPriceToMedusaAmount(firstVariant?.list_price ?? odooProduct.list_price)
            // Utiliser le SKU de la variante en priorité
            const productSku = firstVariant?.default_code || odooProduct.default_code || `ODOO-${firstVariant?.id || odooProduct.id}`
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
            if ((existingProduct as any).deleted_at) {
              productIdsToRestore.push(existingProduct.id)
            }
            productsToUpdate.push(product as UpdateProductWorkflowInputDTO)
          } else {
            productsToCreate.push(product as CreateProductWorkflowInputDTO)
          }
          } catch (error: any) {
            console.error(`❌ Erreur produit ${odooProduct.id}:`, error.message)
          }
        })

        return { productsToCreate, productsToUpdate, productIdsToRestore }
      }
    )

    // Restaurer avant les create/update (sinon recréation → contraintes uniques)
    restoreDeletedProductsStep({ productIdsToRestore, dryRun: !!input.dryRun })

    // Create & Update Steps (identiques à avant, mais je dois réinclure le code complet pour que ça compile)
    // J'abrège ici pour la lisibilité mais je vais remettre le code complet dans le fichier.
    // ... (Code complet Create/Update repris du fichier précédent avec nettoyage MinIO inclus) ...
    
    const createProductsStep = createStep(
      "create-products-from-odoo",
      async ({ productsToCreate, dryRun }: { productsToCreate: any[]; dryRun: boolean }, { container }) => {
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
            
            // Image Upload (MinIO)
            if (productData.odoo_image_base64 && created) {
                try {
                    // Vérifier que les variables MinIO sont définies
                    if (!process.env.MINIO_ENDPOINT || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
                        console.warn(`⚠️ [WORKFLOW] Variables MinIO non définies, upload d'image ignoré pour produit ${created.id}`)
                    } else {
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
                        
                        const filename = `odoo/products/${created.id}/${Date.now()}.png`
                        const buffer = Buffer.from(productData.odoo_image_base64, 'base64')
                        
                        await client.putObject(bucket, filename, buffer, buffer.length, { 
                            'Content-Type': 'image/png', 
                            'x-amz-acl': 'public-read' 
                        })
                        
                        const url = `https://${endpoint}/${bucket}/${filename}`
                        await productService.updateProducts(created.id, { images: [{ url }], thumbnail: url })
                        console.log(`📷 [WORKFLOW] Image uploadée: ${url}`)
                    }
                } catch (e: any) { 
                    console.error(`❌ [WORKFLOW] Erreur upload image MinIO:`, e.message) 
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
            if (dryRun || !productsToUpdate.length) return new StepResponse({ updated: 0 })
            
            let updatedCount = 0
            
            for (const p of productsToUpdate) {
                try {
                    const productService = container.resolve(Modules.PRODUCT)

                    // ✅ Cas ré-import après suppression (soft-delete):
                    // si le produit existe mais est supprimé, il faut le restaurer AVANT l'update.
                    // Sinon l'update (workflow/service) peut échouer et le produit reste invisible dans la liste.
                    try {
                      const current: any = await productService.retrieveProduct(
                        p.id,
                        { select: ["id", "deleted_at"], withDeleted: true } as any
                      )
                      if (current?.deleted_at) {
                        console.log(
                          `♻️ [WORKFLOW] Produit ${p.id} est soft-deleted, restauration avant mise à jour`
                        )
                        await productService.restoreProducts([p.id])
                      }
                    } catch (restoreCheckError: any) {
                      console.warn(
                        `⚠️ [WORKFLOW] Impossible de vérifier/restaurer ${p.id} avant update:`,
                        restoreCheckError?.message || restoreCheckError
                      )
                    }

                    // Préparer le payload pour le workflow update officiel
                    const updatePayload = {
                        id: p.id,
                        title: p.title,
                        description: p.description,
                        handle: p.handle,
                        status: p.status,
                        metadata: p.metadata,
                        // Inclure les variantes avec leurs prix pour mise à jour
                        variants: p.variants?.map((v: any) => ({
                            id: v.id, // ID existant pour update
                            title: v.title,
                            sku: v.sku,
                            barcode: v.barcode,
                            weight: v.weight,
                            metadata: v.metadata,
                            options: v.options,
                            prices: v.prices, // Prix mis à jour depuis Odoo
                        })),
                    }
                    
                    // Utiliser le workflow officiel Medusa qui gère les prix correctement
                    const workflow = updateProductsWorkflow(container)
                    await workflow.run({ input: { products: [updatePayload] } })

                    // 🔁 Forcer la mise à jour des prix via le workflow Pricing (robuste)
                    // Certains payloads "updateProductsWorkflow" peuvent ignorer les prix selon la forme des DTO.
                    if (Array.isArray(p.variants) && p.variants.length) {
                      const fresh = await productService.retrieveProduct(p.id, {
                        relations: ["variants"],
                      })

                      const previousVariantIds = (fresh.variants || []).map((v: any) => v.id)
                      const variantPrices = p.variants
                        .map((v: any) => {
                          const match = (fresh.variants || []).find(
                            (fv: any) => fv.id === v.id || (fv.sku && v.sku && fv.sku === v.sku)
                          )
                          if (!match || !v.prices?.length) return null
                          return {
                            variant_id: match.id,
                            product_id: p.id,
                            prices: v.prices,
                          }
                        })
                        .filter(Boolean)

                      if (variantPrices.length) {
                        const pricingWf = upsertVariantPricesWorkflow(container)
                        await pricingWf.run({
                          input: {
                            variantPrices,
                            previousVariantIds,
                          },
                        })
                      }
                    }
                    
                    console.log(`✅ [WORKFLOW] Produit ${p.title} (${p.id}) mis à jour avec prix`)
                    updatedCount++
                } catch (updateError: any) {
                    console.warn(`⚠️ [WORKFLOW] Erreur mise à jour produit ${p.id}:`, updateError.message)
                    
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
