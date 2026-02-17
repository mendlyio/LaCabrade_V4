import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../../../../modules/odoo"
import OdooModuleService from "../../../../modules/odoo/service"

/**
 * POST /admin/odoo/sync-images
 * Synchronise les images des produits depuis Odoo vers Medusa
 * 
 * Body params:
 *   - force: boolean (default: false) — Si true, remplace TOUTES les images (utile quand la cliente modifie des photos dans Odoo)
 *                                       Si false, n'ajoute que les images manquantes
 *   - productIds: string[] (optional) — Liste d'IDs Medusa spécifiques à synchroniser (sinon tous les produits Odoo)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT)
    const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
    const force = (req.body as any)?.force === true
    const filterProductIds: string[] | undefined = (req.body as any)?.productIds

    console.log(`🖼️ [SYNC-IMAGES] Début sync images (force=${force}, filter=${filterProductIds?.length || 'all'})...`)

    // 1. Récupérer les produits Medusa avec un external_id Odoo
    const medusaProducts = await productService.listProducts(
      filterProductIds ? { id: filterProductIds } : {},
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

    // 3. Pour chaque produit, synchroniser les images
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
        const odooId = parseInt(String(medusaProduct.metadata.external_id))
        const odooProduct = odooProducts.find((p) => p.id === odooId)

        if (!odooProduct) {
          console.warn(
            `⚠️ [SYNC-IMAGES] Produit Odoo ${odooId} non trouvé, skip`
          )
          continue
        }

        const currentImageCount = medusaProduct.images?.length || 0
        const newImageUrls: string[] = []

        // Upload image principale (image_512)
        if (
          odooProduct.image_512 &&
          typeof odooProduct.image_512 === "string"
        ) {
          // En mode force: toujours re-uploader. Sinon: seulement si pas d'image
          const shouldUploadMain = force || currentImageCount === 0

          if (shouldUploadMain) {
            const filename = `odoo/products/${medusaProduct.id}/main-${Date.now()}.png`
            const buffer = Buffer.from(odooProduct.image_512, "base64")
            await minioClient.putObject(bucket, filename, buffer, buffer.length, {
              "Content-Type": "image/png",
              "x-amz-acl": "public-read",
            })
            const url = `https://${endpoint}/${bucket}/${filename}`
            newImageUrls.push(url)
            console.log(
              `📷 [SYNC-IMAGES] Image principale ${force ? 're-uploadée' : 'ajoutée'} pour ${medusaProduct.id}`
            )
          }
        }

        // Upload images additionnelles (EPT)
        if (
          odooProduct.ept_image_ids &&
          Array.isArray(odooProduct.ept_image_ids) &&
          odooProduct.ept_image_ids.length > 0
        ) {
          // En mode force: toujours re-uploader toutes les images additionnelles
          const shouldUploadAdditional = force || currentImageCount <= 1

          if (shouldUploadAdditional) {
            const additionalImages = await odooService.fetchProductImages(
              odooProduct.ept_image_ids
            )

            console.log(
              `📷 [SYNC-IMAGES] ${additionalImages.length} image(s) additionnelle(s) trouvée(s) pour ${medusaProduct.id}`
            )

            const sortedImages = additionalImages.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))

            for (const img of sortedImages) {
              if (img.image && typeof img.image === "string") {
                const filename = `odoo/products/${medusaProduct.id}/img-${img.id}-${Date.now()}.png`
                const buffer = Buffer.from(img.image, "base64")

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
              }
            }
            console.log(
              `📷 [SYNC-IMAGES] ${sortedImages.length} image(s) additionnelle(s) ${force ? 're-uploadée(s)' : 'ajoutée(s)'}`
            )
          }
        }

        // Mettre à jour le produit avec les images
        if (newImageUrls.length > 0) {
          let allImages: { url: string }[]

          if (force) {
            // Mode force: REMPLACER toutes les images par celles d'Odoo
            allImages = newImageUrls.map((url) => ({ url }))
          } else {
            // Mode normal: AJOUTER aux images existantes
            allImages = [
              ...(medusaProduct.images || []).map((img: any) => ({ url: img.url })),
              ...newImageUrls.map((url) => ({ url })),
            ]
          }

          await productService.updateProducts(medusaProduct.id, {
            images: allImages,
            thumbnail: allImages[0].url,
          })

          updated++
          console.log(
            `✅ [SYNC-IMAGES] ${medusaProduct.id}: ${force ? 'images remplacées' : `${newImageUrls.length} image(s) ajoutée(s)`} (${currentImageCount} → ${allImages.length})`
          )
        } else {
          console.log(
            `ℹ️ [SYNC-IMAGES] Aucune modification pour ${medusaProduct.id} (${currentImageCount} image(s))`
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
      `✅ [SYNC-IMAGES] Terminé: ${updated}/${processed} produit(s) mis à jour`
    )

    return res.json({
      success: true,
      message: `Synchronisation des images terminée${force ? ' (mode remplacement)' : ''}`,
      processed,
      updated,
      mode: force ? "replace" : "add_missing",
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

