import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../../../../modules/odoo"
import OdooModuleService from "../../../../modules/odoo/service"

/**
 * POST /admin/odoo/sync-images
 * Synchronise les images manquantes pour tous les produits Odoo déjà importés dans Medusa
 * N'ajoute que les images manquantes, sans supprimer les existantes
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT)
    const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService

    console.log(`🖼️ [SYNC-IMAGES] Début de la synchronisation des images...`)

    // 1. Récupérer tous les produits Medusa qui ont un external_id Odoo
    const medusaProducts = await productService.listProducts(
      {},
      {
        select: ["id", "metadata", "thumbnail"],
        relations: ["images"],
        take: 10000,
      }
    )

    const productsWithOdooId = medusaProducts.filter(
      (p: any) => p.metadata?.external_id
    )

    console.log(
      `🖼️ [SYNC-IMAGES] ${productsWithOdooId.length} produit(s) Medusa avec external_id Odoo trouvé(s)`
    )

    if (productsWithOdooId.length === 0) {
      return res.json({
        success: true,
        message: "Aucun produit à synchroniser",
        processed: 0,
        updated: 0,
      })
    }

    // 2. Récupérer les infos images depuis Odoo
    const odooIds = productsWithOdooId.map((p: any) =>
      parseInt(p.metadata.external_id)
    )
    const odooProducts = await odooService.fetchProductsByIds(odooIds)

    console.log(
      `🖼️ [SYNC-IMAGES] ${odooProducts.length} produit(s) récupéré(s) depuis Odoo`
    )

    // 3. Pour chaque produit, vérifier et ajouter les images manquantes
    let processed = 0
    let updated = 0
    let errors: string[] = []

    // Vérifier les variables MinIO
    if (
      !process.env.MINIO_ENDPOINT ||
      !process.env.MINIO_ACCESS_KEY ||
      !process.env.MINIO_SECRET_KEY
    ) {
      return res.status(500).json({
        error: "Configuration MinIO manquante",
        message:
          "Les variables d'environnement MinIO ne sont pas configurées",
      })
    }

    const { Client } = await import("minio")
    const rawEndpoint = process.env.MINIO_ENDPOINT
    const endpoint = rawEndpoint.replace(/^https?:\/\//, "")
    const bucket = process.env.MINIO_BUCKET || "medusa-media"

    const minioClient = new Client({
      endPoint: endpoint,
      port: 443,
      useSSL: true,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    })

    for (const medusaProduct of productsWithOdooId) {
      try {
        processed++
        const odooId = parseInt(medusaProduct.metadata.external_id)
        const odooProduct = odooProducts.find((p) => p.id === odooId)

        if (!odooProduct) {
          console.warn(
            `⚠️ [SYNC-IMAGES] Produit Odoo ${odooId} non trouvé, skip`
          )
          continue
        }

        const currentImageCount = medusaProduct.images?.length || 0
        const newImageUrls: string[] = []

        // Collecter les URLs d'images existantes pour éviter les doublons
        const existingUrls = new Set(
          (medusaProduct.images || []).map((img: any) => img.url)
        )

        // Upload image principale si pas déjà présente
        if (
          odooProduct.image_512 &&
          typeof odooProduct.image_512 === "string"
        ) {
          const filename = `odoo/products/${medusaProduct.id}/main-${Date.now()}.png`
          
          // Vérifier si on a déjà une image principale (via thumbnail ou première image)
          const hasMainImage = currentImageCount > 0
          
          if (!hasMainImage) {
            const buffer = Buffer.from(odooProduct.image_512, "base64")
            await minioClient.putObject(bucket, filename, buffer, buffer.length, {
              "Content-Type": "image/png",
              "x-amz-acl": "public-read",
            })
            const url = `https://${endpoint}/${bucket}/${filename}`
            newImageUrls.push(url)
            console.log(
              `📷 [SYNC-IMAGES] Image principale ajoutée pour ${medusaProduct.id}`
            )
          }
        }

        // Upload images additionnelles depuis product.image
        if (
          odooProduct.product_image_ids &&
          Array.isArray(odooProduct.product_image_ids) &&
          odooProduct.product_image_ids.length > 0
        ) {
          const additionalImages = await odooService.fetchProductImages(
            odooProduct.product_image_ids
          )

          console.log(
            `📷 [SYNC-IMAGES] ${additionalImages.length} image(s) additionnelle(s) trouvée(s) dans Odoo pour ${medusaProduct.id}`
          )

          for (const img of additionalImages) {
            if (img.image_1920 && typeof img.image_1920 === "string") {
              const filename = `odoo/products/${medusaProduct.id}/img-${img.id}-${Date.now()}.png`
              const buffer = Buffer.from(img.image_1920, "base64")

              await minioClient.putObject(
                bucket,
                filename,
                buffer,
                buffer.length,
                {
                  "Content-Type": "image/png",
                  "x-amz-acl": "public-read",
                }
              )

              const url = `https://${endpoint}/${bucket}/${filename}`
              newImageUrls.push(url)
              console.log(
                `📷 [SYNC-IMAGES] Image additionnelle ajoutée pour ${medusaProduct.id}`
              )
            }
          }
        }

        // Mettre à jour le produit avec les nouvelles images (en ajoutant aux existantes)
        if (newImageUrls.length > 0) {
          const allImages = [
            ...(medusaProduct.images || []).map((img: any) => ({ url: img.url })),
            ...newImageUrls.map((url) => ({ url })),
          ]

          await productService.updateProducts(medusaProduct.id, {
            images: allImages,
            thumbnail: medusaProduct.thumbnail || allImages[0].url,
          })

          updated++
          console.log(
            `✅ [SYNC-IMAGES] ${newImageUrls.length} image(s) ajoutée(s) au produit ${medusaProduct.id} (${currentImageCount} → ${allImages.length})`
          )
        } else {
          console.log(
            `ℹ️ [SYNC-IMAGES] Aucune image manquante pour ${medusaProduct.id} (${currentImageCount} image(s))`
          )
        }
      } catch (error: any) {
        console.error(
          `❌ [SYNC-IMAGES] Erreur produit ${medusaProduct.id}:`,
          error.message
        )
        errors.push(`${medusaProduct.id}: ${error.message}`)
      }
    }

    console.log(
      `✅ [SYNC-IMAGES] Synchronisation terminée: ${updated}/${processed} produit(s) mis à jour`
    )

    return res.json({
      success: true,
      message: `Synchronisation des images terminée`,
      processed,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("❌ [SYNC-IMAGES] Erreur globale:", error)
    return res.status(500).json({
      error: "Erreur lors de la synchronisation des images",
      message: error.message,
    })
  }
}

