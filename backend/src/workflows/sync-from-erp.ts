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
import {
  CreateProductWorkflowInputDTO,
  UpdateProductWorkflowInputDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import { OdooProduct, Pagination } from "../modules/odoo/service"
import OdooModuleService from "../modules/odoo/service"

type SyncFromErpInput = Pagination & {
  dryRun?: boolean
  filterProductIds?: number[] // IDs des produits à synchroniser (si non fourni, tous)
}

// Step pour récupérer les produits depuis Odoo
const fetchOdooProductsStep = createStep(
  "fetch-odoo-products",
  async (input: SyncFromErpInput, { container }) => {
    console.log(`📥 [WORKFLOW] Récupération produits Odoo`)
    
    // Vérifier si le module Odoo est disponible
    let odooModuleService: OdooModuleService
    try {
      odooModuleService = container.resolve(ODOO_MODULE) as OdooModuleService
    } catch (error) {
      console.error(`❌ [WORKFLOW] Module Odoo non disponible:`, error)
      throw new Error("Module Odoo non configuré. Veuillez ajouter les variables d'environnement ODOO_*")
    }
    
    let products: OdooProduct[]
    
    // Si des IDs spécifiques sont demandés, les récupérer directement
    if (input.filterProductIds && input.filterProductIds.length > 0) {
      console.log(`🔍 [WORKFLOW] Récupération directe des produits IDs:`, input.filterProductIds)
      products = await odooModuleService.fetchProductsByIds(input.filterProductIds)
      console.log(`✅ [WORKFLOW] ${products.length} produits récupérés`)
    } else {
      // Sinon, récupération paginée
      console.log(`📄 [WORKFLOW] Récupération paginée (offset: ${input.offset}, limit: ${input.limit})`)
      const result = await odooModuleService.fetchProductsPaged({
        offset: input.offset,
        limit: input.limit,
      })
      products = result.products
      console.log(`📦 [WORKFLOW] ${products.length} produits récupérés depuis Odoo`)
    }
    
    return new StepResponse(products)
  }
)

// Step pour récupérer les produits existants dans Medusa
const fetchExistingProductsStep = createStep(
  "fetch-existing-products",
  async ({ odooProducts }: { odooProducts: OdooProduct[] }, { container }) => {
    console.log(`🔍 [WORKFLOW] Recherche produits existants dans Medusa pour ${odooProducts.length} produits`)
    
    const productService = container.resolve(Modules.PRODUCT)
    
    const externalIds = odooProducts.map((p: OdooProduct) => `${p.id}`)
    
    // Récupérer tous les produits et filtrer manuellement
    const products = await productService.listProducts({})
    const filteredProducts = products.filter((p: any) => 
      externalIds.includes(p.metadata?.external_id)
    )

    console.log(`✅ [WORKFLOW] ${filteredProducts.length} produits déjà présents dans Medusa`)

    return new StepResponse(filteredProducts)
  }
)

export const syncFromErpWorkflow = createWorkflow(
  "sync-from-erp",
  function (input: SyncFromErpInput) {
    // Récupérer les produits depuis Odoo (filtrage déjà fait dans le step)
    const odooProducts = fetchOdooProductsStep(input)

    // Récupérer les produits existants dans Medusa
    const existingProducts = fetchExistingProductsStep({ odooProducts })

    // Préparer les produits à créer et à mettre à jour
    const { productsToCreate, productsToUpdate } = transform(
      { odooProducts, existingProducts },
      ({ odooProducts, existingProducts }) => {
        console.log(`🔄 [WORKFLOW] Transformation des produits...`)
        
        const productsToCreate: CreateProductWorkflowInputDTO[] = []
        const productsToUpdate: UpdateProductWorkflowInputDTO[] = []

        odooProducts.forEach((odooProduct: OdooProduct) => {
          try {
            console.log(`📝 [WORKFLOW] Traitement produit: ${odooProduct.display_name} (ID: ${odooProduct.id})`)
          const existingProduct = existingProducts.find(
            (p) => p.metadata?.external_id === `${odooProduct.id}`
          )

          const product: any = {
            id: existingProduct?.id,
              title: odooProduct.display_name || odooProduct.name || `Produit ${odooProduct.id}`,
            description: odooProduct.description_sale || undefined,
              handle: (odooProduct.display_name || odooProduct.name || `product-${odooProduct.id}`)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
              status: "published",
            metadata: {
              external_id: `${odooProduct.id}`,
            },
            options: [],
            variants: [],
              odoo_image_base64: (odooProduct.image_128 && typeof odooProduct.image_128 === 'string') 
                ? odooProduct.image_128 
                : undefined, // Stockage temporaire pour upload ultérieur
          }

          // Gérer les options et variantes
          if (odooProduct.product_variant_count > 1) {
            // Créer les options basées sur les attributs
            if (odooProduct.attribute_line_ids?.length) {
              product.options = odooProduct.attribute_line_ids.map((line) => ({
                title: line.attribute_id.display_name,
                values: line.value_ids.map((v) => v.name),
              }))
            }

            // Créer les variantes
            product.variants = odooProduct.product_variant_ids.map((variant) => {
              const options: Record<string, string> = {}
              
              if (variant.product_template_variant_value_ids?.length) {
                variant.product_template_variant_value_ids.forEach((value) => {
                  options[value.attribute_id.display_name] = value.name
                })
              } else {
                product.options?.forEach((option: any) => {
                  options[option.title] = option.values[0]
                })
              }

              // Poids en grammes (Odoo utilise des kg)
              const weightInGrams = variant.weight ? Math.round(variant.weight * 1000) : undefined
              
              // Prix en centimes (Odoo retourne en unité monétaire)
              const priceInCents = Math.round(variant.list_price * 100)
              
              // Générer un SKU si absent : utilise code OU génère "ODOO-{variant_id}"
              const variantSku = variant.code || `ODOO-${variant.id}`

              return {
                id: existingProduct 
                  ? existingProduct.variants.find((v) => v.sku === variantSku || v.sku === variant.code)?.id 
                  : undefined,
                title: (variant.display_name || variant.name || "Variante")
                  .replace(variant.code ? `[${variant.code}] ` : "", ""),
                sku: variantSku,
                barcode: variant.barcode || undefined,
                weight: weightInGrams,
                options,
                prices: [
                  {
                    amount: priceInCents,
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
                  generated_sku: !variant.code, // Indique si le SKU a été généré automatiquement
                },
              }
            })
          } else {
            // Produit simple sans variantes
            const weightInGrams = odooProduct.weight ? Math.round(odooProduct.weight * 1000) : undefined
            const priceInCents = Math.round(odooProduct.list_price * 100)
            
            // Générer un SKU si absent : utilise default_code OU génère "ODOO-{product_id}"
            const productSku = odooProduct.default_code || `ODOO-${odooProduct.id}`
            
            product.options = [
              {
                title: "Default",
                values: ["Default"],
              }
            ]
            product.variants.push({
              id: existingProduct ? existingProduct.variants[0].id : undefined,
              title: "Default",
              sku: productSku,
              barcode: odooProduct.default_code || undefined, // Utiliser le code produit comme barcode
              weight: weightInGrams,
              options: {
                Default: "Default",
              },
              prices: [
                {
                  amount: priceInCents,
                  currency_code: (Array.isArray(odooProduct.currency_id) ? odooProduct.currency_id[1] : "eur")?.toLowerCase() || "eur",
                },
              ],
              metadata: {
                external_id: `${odooProduct.id}`,
                odoo_product_id: odooProduct.id,
                odoo_weight_kg: odooProduct.weight,
                odoo_volume: odooProduct.volume,
                odoo_qty_available: odooProduct.qty_available || 0,
                generated_sku: !odooProduct.default_code, // Indique si le SKU a été généré automatiquement
              },
              manage_inventory: true,
            })
          }

          if (existingProduct) {
            console.log(`  ✏️  Produit existant -> mise à jour`)
            productsToUpdate.push(product as UpdateProductWorkflowInputDTO)
          } else {
            console.log(`  ➕ Nouveau produit -> création`)
            productsToCreate.push(product as CreateProductWorkflowInputDTO)
          }
          } catch (error: any) {
            console.error(`❌ [WORKFLOW] Erreur traitement produit ${odooProduct.id}:`, error.message)
            console.error(`❌ [WORKFLOW] Stack:`, error.stack)
          }
        })

        console.log(`✅ [WORKFLOW] Transformation terminée: ${productsToCreate.length} à créer, ${productsToUpdate.length} à mettre à jour`)

        return {
          productsToCreate,
          productsToUpdate,
        }
      }
    )

    // Créer les nouveaux produits avec une étape dédiée
    const createProductsStep = createStep(
      "create-products-from-odoo",
      async ({ productsToCreate, dryRun }: { productsToCreate: any[]; dryRun: boolean }, { container }) => {
        if (dryRun || productsToCreate.length === 0) {
          console.log(`⏭️  [WORKFLOW] Pas de création (dry-run=${dryRun}, count=${productsToCreate.length})`)
          return new StepResponse({ created: 0 })
        }

        console.log(`📦 [WORKFLOW] Création de ${productsToCreate.length} produits dans Medusa...`)
        
        const productService = container.resolve(Modules.PRODUCT)
        const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
        const inventoryService = container.resolve(Modules.INVENTORY)
        const createdProducts = []
        
        // Récupérer le canal de vente "LaCabrade" (ou le créer s'il n'existe pas)
        let salesChannels = await salesChannelService.listSalesChannels({ name: "LaCabrade" })
        let lacabradeChannel = salesChannels[0]
        
        if (!lacabradeChannel) {
          console.log(`  📺 Création du canal de vente "LaCabrade"`)
          const createdChannels = await salesChannelService.createSalesChannels({
            name: "LaCabrade",
            description: "Canal de vente principal LaCabrade",
          })
          lacabradeChannel = Array.isArray(createdChannels) ? createdChannels[0] : createdChannels
        }
        
        console.log(`  📺 Canal de vente utilisé: "${lacabradeChannel.name}" (ID: ${lacabradeChannel.id})`)
        
        for (const productData of productsToCreate) {
          try {
            console.log(`\n  🔨 Création du produit: ${productData.title}`)
            console.log(`  📝 Options:`, JSON.stringify(productData.options, null, 2))
            console.log(`  📝 Variantes (${productData.variants?.length || 0}):`)
            productData.variants?.forEach((v: any, i: number) => {
              console.log(`    [${i}] SKU: ${v.sku}, Titre: ${v.title}, Prix: ${v.prices?.[0]?.amount || 'N/A'}`)
            })
            
            // ÉTAPE 1: Créer le produit de base (sans sales_channels dans createProducts)
            const productPayload = {
              title: productData.title,
              description: productData.description,
              handle: productData.handle,
              status: productData.status,
              metadata: productData.metadata,
              options: productData.options,
              variants: productData.variants,
            }
            
            console.log(`  🚀 Appel createProducts()...`)
            let created: any
            
            try {
              const createdArray = await productService.createProducts(productPayload)
              console.log(`  📦 Résultat createProducts:`, createdArray?.length || 0, 'produit(s)')
              
              created = Array.isArray(createdArray) ? createdArray[0] : createdArray
              
              // Si pas d'ID, on récupère le produit par son handle
              if (!created?.id && productPayload.handle) {
                console.log(`  🔍 Récupération du produit par handle: ${productPayload.handle}`)
                const products = await productService.listProducts({ handle: productPayload.handle })
                if (products && products.length > 0) {
                  created = products[0]
                  console.log(`  ✅ Produit récupéré: ${created.id}`)
                }
              }
            } catch (createError: any) {
              console.error(`  ❌ Erreur createProducts:`, createError.message)
              console.error(`  Stack:`, createError.stack)
              continue
            }
            
            if (!created?.id) {
              console.error(`  ❌ Produit non créé - pas d'ID retourné!`)
              continue
            }
            
            console.log(`  ✅ Produit créé avec ID: ${created.id}`)
            
            // ÉTAPE 2: Associer au sales channel via une mise à jour séparée
            // Note: updateProducts ne supporte pas sales_channels directement
            // Il faut utiliser un autre service ou laisser l'association se faire via l'admin
            console.log(`    📺 Sales channel: Sera associé via l'admin ou API séparée`)
            
            // ÉTAPE 3: Uploader l'image Odoo vers MinIO si disponible
            if (productData.odoo_image_base64) {
              try {
                console.log(`    📷 Upload image vers MinIO...`)
                
                // Import du client MinIO
                const { Client } = await import('minio')
                
                const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'bucket-production-de72.up.railway.app'
                const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'jrkw3qd9t17ftl'
                const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || '9lmslk6nfmjhaph24v5qov71u43doz8x'
                const MINIO_BUCKET = process.env.MINIO_BUCKET || 'medusa-media'
                
                // Créer le client MinIO
                const minioClient = new Client({
                  endPoint: MINIO_ENDPOINT,
                  port: 443,
                  useSSL: true,
                  accessKey: MINIO_ACCESS_KEY,
                  secretKey: MINIO_SECRET_KEY,
                })
                
                // Préparer le fichier
                const filename = `odoo/products/${created.id}/${Date.now()}.png`
                const imageBuffer = Buffer.from(productData.odoo_image_base64, 'base64')
                
                console.log(`    📤 Upload vers ${MINIO_BUCKET}/${filename} (${imageBuffer.length} bytes)`)
                
                // Upload vers MinIO
                await minioClient.putObject(
                  MINIO_BUCKET,
                  filename,
                  imageBuffer,
                  imageBuffer.length,
                  {
                    'Content-Type': 'image/png',
                    'x-amz-acl': 'public-read'
                  }
                )
                
                // Générer l'URL publique
                const imageUrl = `https://${MINIO_ENDPOINT}/${MINIO_BUCKET}/${filename}`
                console.log(`    🔗 URL générée: ${imageUrl}`)
                
                // Associer l'image au produit ET définir comme thumbnail
                await productService.updateProducts(created.id, {
                  images: [{ url: imageUrl }],
                  thumbnail: imageUrl, // Pour la miniature
                })
                console.log(`    🖼️  Image uploadée et associée au produit (+ thumbnail)`)
              } catch (imgErr: any) {
                console.error(`    ⚠️  Erreur upload image:`, imgErr.message)
                console.error(`    Stack:`, imgErr.stack)
              }
            }
            
            // ÉTAPE 4: Initialiser le stock pour chaque variante
            console.log(`    📦 Initialisation du stock...`)
            
            // Utiliser les variantes des données d'origine (productData) qui contiennent le stock Odoo
            if (productData.variants && productData.variants.length > 0) {
              try {
                // Récupérer les stock locations
                const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
                const { result: stockLocations } = await stockLocationService.listStockLocations({})
                
                console.log(`      → ${stockLocations.length} stock location(s) trouvé(s)`)
                
                if (stockLocations.length > 0) {
                  const defaultLocation = stockLocations[0]
                  
                  for (const variantData of productData.variants) {
                    try {
                      const odooStock = variantData.metadata?.odoo_qty_available || 0
                      console.log(`      → Variante ${variantData.sku}: stock Odoo = ${odooStock}`)
                      
                      // Récupérer l'inventory item de cette variante
                      const { result: inventoryItems } = await inventoryService.listInventoryItems({
                        sku: variantData.sku,
                      })
                      
                      if (inventoryItems.length > 0) {
                        const inventoryItem = inventoryItems[0]
                        
                        // Créer le niveau de stock
                        await inventoryService.createInventoryLevels({
                          inventory_item_id: inventoryItem.id,
                          location_id: defaultLocation.id,
                          stocked_quantity: odooStock,
                        })
                        console.log(`      ✅ Stock initialisé: ${variantData.sku} = ${odooStock}`)
                      } else {
                        console.log(`      ⚠️  Pas d'inventory item pour ${variantData.sku}`)
                      }
                    } catch (stockErr: any) {
                      console.error(`      ❌ Erreur stock ${variantData.sku}:`, stockErr.message)
                    }
                  }
                } else {
                  console.log(`    ⚠️  Aucun stock location trouvé - stock non initialisé`)
                }
              } catch (stockErr: any) {
                console.error(`    ❌ Erreur initialisation stock globale:`, stockErr.message)
                console.error(`    Stack:`, stockErr.stack)
              }
            }
            
            // ÉTAPE 5: Récupérer le produit complet avec toutes les relations
            const fullProduct = await productService.retrieveProduct(created.id, {
              relations: ["images", "variants", "variants.prices", "options", "options.values"]
            })
            
            createdProducts.push(fullProduct)
            
            console.log(`  ✅ COMPLET: ${productData.title}`)
            console.log(`    → Images: ${fullProduct.images?.length || 0}`)
            console.log(`    → Thumbnail: ${fullProduct.thumbnail ? 'OUI' : 'NON'}`)
            console.log(`    → Variantes: ${fullProduct.variants?.length || 0}`)
            if (fullProduct.variants && fullProduct.variants.length > 0) {
              fullProduct.variants.forEach((v: any, i: number) => {
                console.log(`      [${i}] ${v.sku}: Prix = ${v.prices?.[0]?.amount || 'N/A'} ${v.prices?.[0]?.currency_code || ''}`)
              })
            }
          } catch (error: any) {
            console.error(`  ❌ Erreur création ${productData.title}:`, error.message)
            console.error(`  Stack:`, error.stack)
          }
        }

        console.log(`✅ [WORKFLOW] ${createdProducts.length}/${productsToCreate.length} produits créés avec succès`)
        return new StepResponse({ created: createdProducts.length })
      }
    )

    const createResult = createProductsStep({ 
      productsToCreate, 
      dryRun: input.dryRun 
    })

    // Mettre à jour les produits existants avec une étape dédiée
    const updateProductsStep = createStep(
      "update-products-from-odoo",
      async ({ productsToUpdate, dryRun }: { productsToUpdate: any[]; dryRun: boolean }, { container }) => {
        if (dryRun || productsToUpdate.length === 0) {
          console.log(`⏭️  [WORKFLOW] Pas de mise à jour (dry-run=${dryRun}, count=${productsToUpdate.length})`)
          return new StepResponse({ updated: 0 })
        }

        console.log(`📝 [WORKFLOW] Mise à jour de ${productsToUpdate.length} produits dans Medusa...`)
        
        const productService = container.resolve(Modules.PRODUCT)
        const updatedProducts = []
        
        for (const productData of productsToUpdate) {
          try {
            // Mise à jour du produit principal
            const updated = await productService.updateProducts(productData.id, {
              title: productData.title,
              description: productData.description,
              handle: productData.handle,
              status: productData.status,
              metadata: productData.metadata,
            })
            
            // Mise à jour des variantes et prix
            if (productData.variants && productData.variants.length > 0) {
              for (const variantData of productData.variants) {
                if (variantData.id) {
                  // Variante existante : mise à jour
                  try {
                    await productService.updateProductVariants(variantData.id, {
                      title: variantData.title,
                      sku: variantData.sku,
                      barcode: variantData.barcode,
                      weight: variantData.weight,
                      options: variantData.options,
                      metadata: variantData.metadata,
                      manage_inventory: variantData.manage_inventory,
                    })
                    
                    // Note: Les prix sont mis à jour lors de la création/import initial
                    // Pour mettre à jour les prix d'une variante existante, il faut supprimer et recréer la variante
                    // TODO: Implémenter la mise à jour des prix via le service de prix (région-specific)
                    
                    console.log(`    ↳ Variante mise à jour: ${variantData.title}`)
                  } catch (varErr: any) {
                    console.error(`    ❌ Erreur MAJ variante ${variantData.title}:`, varErr.message)
                  }
                } else {
                  // Nouvelle variante : création
                  try {
                    await productService.createProductVariants(productData.id, variantData)
                    console.log(`    ↳ Nouvelle variante créée: ${variantData.title}`)
                  } catch (varErr: any) {
                    console.error(`    ❌ Erreur création variante ${variantData.title}:`, varErr.message)
                  }
                }
              }
            }
            
            updatedProducts.push(updated)
            console.log(`  ✅ Mis à jour: ${productData.title}`)
          } catch (error: any) {
            console.error(`  ❌ Erreur mise à jour ${productData.title}:`, error.message)
            console.error(`  Stack:`, error.stack)
          }
        }

        console.log(`✅ [WORKFLOW] ${updatedProducts.length}/${productsToUpdate.length} produits mis à jour avec succès`)
        return new StepResponse({ updated: updatedProducts.length })
      }
    )

    const updateResult = updateProductsStep({ 
      productsToUpdate, 
      dryRun: input.dryRun 
    })

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

