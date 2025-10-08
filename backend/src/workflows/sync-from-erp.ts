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
    console.log(`📥 [WORKFLOW] Récupération produits Odoo (offset: ${input.offset}, limit: ${input.limit})`)
    
    // Vérifier si le module Odoo est disponible
    let odooModuleService: OdooModuleService
    try {
      odooModuleService = container.resolve(ODOO_MODULE) as OdooModuleService
    } catch (error) {
      console.error(`❌ [WORKFLOW] Module Odoo non disponible:`, error)
      throw new Error("Module Odoo non configuré. Veuillez ajouter les variables d'environnement ODOO_*")
    }
    
    const { products } = await odooModuleService.fetchProductsPaged({
      offset: input.offset,
      limit: input.limit,
    })
    
    console.log(`📦 [WORKFLOW] ${products.length} produits récupérés depuis Odoo`)
    
    // Filtrer par IDs si spécifié
    let filteredProducts = products
    if (input.filterProductIds && input.filterProductIds.length > 0) {
      console.log(`🔍 [WORKFLOW] Filtrage par IDs:`, input.filterProductIds)
      filteredProducts = products.filter((p: OdooProduct) => input.filterProductIds!.includes(p.id))
      console.log(`✅ [WORKFLOW] ${filteredProducts.length} produits après filtrage`)
    }
    
    return new StepResponse(filteredProducts)
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
              title: odooProduct.display_name,
              description: odooProduct.description_sale || undefined,
              handle: odooProduct.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
              status: "published",
              metadata: {
                external_id: `${odooProduct.id}`,
              },
              options: [],
              variants: [],
            }
            
            // Ajouter l'image principale si disponible
            // Note: Medusa v2 ne supporte pas les data URLs pour les images
            // Il faudrait upload les images vers un service (MinIO) et utiliser l'URL
            // Pour l'instant, on skip les images base64

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
                title: variant.display_name.replace(`[${variant.code}] `, ""),
                sku: variantSku,
                barcode: variant.barcode || undefined,
                weight: weightInGrams,
                options,
                prices: [
                  {
                    amount: priceInCents,
                    currency_code: variant.currency_id.display_name.toLowerCase(),
                  },
                ],
                manage_inventory: true,
                metadata: {
                  external_id: `${variant.id}`,
                  odoo_variant_id: variant.id,
                  odoo_weight_kg: variant.weight,
                  odoo_volume: variant.volume,
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
              weight: weightInGrams,
              options: {
                Default: "Default",
              },
              prices: [
                {
                  amount: priceInCents,
                  currency_code: odooProduct.currency_id.display_name.toLowerCase(),
                },
              ],
              metadata: {
                external_id: `${odooProduct.id}`,
                odoo_product_id: odooProduct.id,
                odoo_weight_kg: odooProduct.weight,
                odoo_volume: odooProduct.volume,
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

    // Créer les nouveaux produits (sauf si dry-run)
    if (!input.dryRun) {
      createProductsWorkflow.runAsStep({
        input: {
          products: productsToCreate,
        },
      })

      // Mettre à jour les produits existants
      updateProductsWorkflow.runAsStep({
        input: {
          products: productsToUpdate,
        },
      })
    }

    return new WorkflowResponse({
      odooProducts,
      productsProcessed: odooProducts.length,
      toCreate: productsToCreate.length,
      toUpdate: productsToUpdate.length,
    })
  }
)

