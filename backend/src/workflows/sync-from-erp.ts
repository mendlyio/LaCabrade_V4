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
    // Vérifier si le module Odoo est disponible
    let odooModuleService: OdooModuleService
    try {
      odooModuleService = container.resolve(ODOO_MODULE) as OdooModuleService
    } catch (error) {
      throw new Error("Module Odoo non configuré. Veuillez ajouter les variables d'environnement ODOO_*")
    }
    
    let products = await odooModuleService.fetchProducts(input)
    
    // Filtrer par IDs si spécifié (dans le step, pas dans le workflow)
    if (input.filterProductIds && input.filterProductIds.length > 0) {
      products = products.filter((p: OdooProduct) => input.filterProductIds!.includes(p.id))
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
    
    // Récupérer tous les produits et filtrer manuellement
    const products = await productService.listProducts({})
    const filteredProducts = products.filter((p: any) => 
      externalIds.includes(p.metadata?.external_id)
    )

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
        const productsToCreate: CreateProductWorkflowInputDTO[] = []
        const productsToUpdate: UpdateProductWorkflowInputDTO[] = []

        odooProducts.forEach((odooProduct: OdooProduct) => {
          const existingProduct = existingProducts.find(
            (p) => p.metadata?.external_id === `${odooProduct.id}`
          )

          const product: any = {
            id: existingProduct?.id,
            title: odooProduct.display_name,
            description: odooProduct.description_sale || undefined,
            metadata: {
              external_id: `${odooProduct.id}`,
            },
            options: [],
            variants: [],
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

              return {
                id: existingProduct 
                  ? existingProduct.variants.find((v) => v.sku === variant.code)?.id 
                  : undefined,
                title: variant.display_name.replace(`[${variant.code}] `, ""),
                sku: variant.code || undefined,
                options,
                prices: [
                  {
                    amount: variant.list_price,
                    currency_code: variant.currency_id.display_name.toLowerCase(),
                  },
                ],
                manage_inventory: false, // Changer en true si vous synchronisez l'inventaire depuis Odoo
                metadata: {
                  external_id: `${variant.id}`,
                },
              }
            })
          } else {
            // Produit simple sans variantes
            product.variants.push({
              id: existingProduct ? existingProduct.variants[0].id : undefined,
              title: "Default",
              options: {
                Default: "Default",
              },
              prices: [
                {
                  amount: odooProduct.list_price,
                  currency_code: odooProduct.currency_id.display_name.toLowerCase(),
                },
              ],
              metadata: {
                external_id: `${odooProduct.id}`,
              },
              manage_inventory: false, // Changer en true si vous synchronisez l'inventaire depuis Odoo
            })
          }

          if (existingProduct) {
            productsToUpdate.push(product as UpdateProductWorkflowInputDTO)
          } else {
            productsToCreate.push(product as CreateProductWorkflowInputDTO)
          }
        })

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

