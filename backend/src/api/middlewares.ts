import type { MiddlewaresConfig } from "@medusajs/medusa"
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import rateLimit from "express-rate-limit"
import { GIFT_CARD_PRODUCT_HANDLE } from "../utils/gift-card-amount"

function getClientIp(req: any): string {
  const forwarded = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
  return forwarded || req.socket?.remoteAddress || "unknown"
}

const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { ip: false },
  handler: (_req: MedusaRequest, res: MedusaResponse) => {
    res.status(429).json({
      message: "Trop de tentatives. Veuillez réessayer dans 15 minutes.",
    })
  },
  skip: (req: MedusaRequest) => {
    const body = req.body as Record<string, unknown>
    return !!body?.website
  },
})

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { ip: false },
  handler: (_req: MedusaRequest, res: MedusaResponse) => {
    res.status(429).json({
      message: "Trop de messages envoyés. Veuillez réessayer dans 1 heure.",
    })
  },
  skip: (req: MedusaRequest) => {
    const body = req.body as Record<string, unknown>
    return !!body?.website
  },
})

/**
 * Les bons cadeau ne doivent pas passer par POST /store/carts/:id/line-items
 * (prix catalogue en centimes, quantité libre). Uniquement l'endpoint dédié.
 */
async function blockGiftCardStandardLineItems(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (req.method !== "POST") {
    return next()
  }
  const variantId = (req.body as { variant_id?: string })?.variant_id
  if (!variantId) {
    return next()
  }
  try {
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const variants = await productModule.listProductVariants(
      { id: variantId },
      { take: 1 }
    )
    const variant = variants?.[0]
    if (!variant) {
      return next()
    }
    const sku = String(variant.sku || "")
    if (sku.startsWith("GC-")) {
      res.status(400).json({
        message:
          "Les bons cadeau doivent être ajoutés via le formulaire dédié (montant 10–500 €).",
      })
      return
    }
    if (variant.product_id) {
      const products = await productModule.listProducts(
        { id: variant.product_id },
        { take: 1 }
      )
      const product = products?.[0]
      if (
        product?.handle === GIFT_CARD_PRODUCT_HANDLE ||
        product?.is_giftcard === true
      ) {
        res.status(400).json({
          message:
            "Les bons cadeau doivent être ajoutés via le formulaire dédié (montant 10–500 €).",
        })
        return
      }
    }
  } catch {
    // Ne pas bloquer le panier si la résolution produit échoue
  }
  return next()
}

export const config: MiddlewaresConfig = {
  routes: [
    {
      matcher: "/store/newsletter",
      middlewares: [newsletterLimiter as unknown as (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => void],
    },
    {
      matcher: "/store/contact",
      middlewares: [contactLimiter as unknown as (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => void],
    },
    {
      matcher: "/store/carts/:id/line-items",
      middlewares: [blockGiftCardStandardLineItems],
    },
  ],
}
