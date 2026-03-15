import type { MiddlewaresConfig } from "@medusajs/medusa"
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import rateLimit from "express-rate-limit"

/**
 * Rate limiter newsletter : 5 inscriptions max par IP toutes les 15 minutes.
 * Protège contre les soumissions en masse et l'abus de codes promo.
 */
const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Prend l'IP réelle via Railway (X-Forwarded-For)
    const forwarded = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    return forwarded || req.ip || "unknown"
  },
  handler: (_req: MedusaRequest, res: MedusaResponse) => {
    res.status(429).json({
      message: "Trop de tentatives. Veuillez réessayer dans 15 minutes.",
    })
  },
  skip: (req: MedusaRequest) => {
    // Ne bloque pas si c'est un bot détecté par honeypot (déjà géré silencieusement)
    const body = req.body as Record<string, unknown>
    return !!body?.website
  },
})

/**
 * Rate limiter contact : 3 messages max par IP par heure.
 * Protège contre le spam de messages de contact.
 */
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    return forwarded || req.ip || "unknown"
  },
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
  ],
}
